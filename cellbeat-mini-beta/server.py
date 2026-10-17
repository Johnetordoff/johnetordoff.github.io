#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, mimetypes, os, secrets, sqlite3, threading
from datetime import datetime, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
MINI = ROOT.parent / "cellbeat-mini"
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "10000"))
DATA_DIR = Path(os.environ.get("CELLBEAT_BETA_DATA_DIR", ROOT / ".data"))
DB = DATA_DIR / "sharing.sqlite3"
COOKIE = "cellbeat_mini_beta_identity"
LOCK = threading.RLock()
MAX_SESSION = 2_097_152
MAX_TITLE = 80

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shared_songs(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, title TEXT NOT NULL, session_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS shared_songs_title_nocase ON shared_songs(title COLLATE NOCASE);
"""

def stamp(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
def h(token): return hashlib.sha256(token.encode()).hexdigest()
def db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    c=sqlite3.connect(DB, timeout=5); c.execute('PRAGMA busy_timeout=5000'); return c

def init():
    with LOCK, db() as c: c.executescript(SCHEMA)

def user_for(token):
    if not token: return None
    with LOCK, db() as c: r=c.execute('SELECT id FROM users WHERE token_hash=?',(h(token),)).fetchone()
    return int(r[0]) if r else None

def new_user():
    token=secrets.token_urlsafe(32)
    with LOCK, db() as c:
        cur=c.execute('INSERT INTO users(token_hash,created_at) VALUES (?,?)',(h(token),stamp())); c.commit()
    return int(cur.lastrowid), token

def mine(uid):
    with LOCK, db() as c: r=c.execute('SELECT id,title,updated_at FROM shared_songs WHERE user_id=?',(uid,)).fetchone()
    return None if not r else {'id':int(r[0]),'title':r[1],'updated_at':r[2]}

def search(q):
    q=' '.join(str(q or '').split())[:MAX_TITLE]
    with LOCK, db() as c:
        if q:
            rows=c.execute('SELECT id,title,updated_at FROM shared_songs WHERE instr(lower(title),lower(?))>0 ORDER BY updated_at DESC LIMIT 40',(q,)).fetchall()
        else:
            rows=c.execute('SELECT id,title,updated_at FROM shared_songs ORDER BY updated_at DESC LIMIT 40').fetchall()
    return [{'id':int(r[0]),'title':r[1],'updated_at':r[2]} for r in rows]

def fetch_song(sid):
    with LOCK, db() as c: r=c.execute('SELECT id,title,session_json,updated_at FROM shared_songs WHERE id=?',(sid,)).fetchone()
    return None if not r else {'id':int(r[0]),'title':r[1],'session':r[2],'updated_at':r[3]}

def normalize_session(text):
    if not isinstance(text,str) or len(text.encode())>MAX_SESSION: raise ValueError('session_size')
    try: data=json.loads(text)
    except Exception as e: raise ValueError('session_json') from e
    if not isinstance(data,dict) or data.get('format')!='cellbeat-mini-session': raise ValueError('session_format')
    v=data.get('version')
    if not isinstance(v,int) or not 1<=v<=10: raise ValueError('session_version')
    return json.dumps(data,separators=(',',':'),ensure_ascii=False)

def share(uid,title,session):
    title=' '.join(str(title or '').split())
    if not title or len(title)>MAX_TITLE: raise ValueError('title')
    session=normalize_session(session); t=stamp()
    with LOCK, db() as c:
        c.execute('INSERT INTO shared_songs(user_id,title,session_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET title=excluded.title,session_json=excluded.session_json,updated_at=excluded.updated_at',(uid,title,session,t)); c.commit()
    return mine(uid)

def safe(base, rel):
    p=(base / rel.lstrip('/')).resolve()
    try: p.relative_to(base.resolve())
    except ValueError: return None
    if p.is_dir(): p=p/'index.html'
    return p if p.is_file() else None

class H(BaseHTTPRequestHandler):
    server_version='CellbeatMiniBeta/1.0'
    def log_message(self,*a): pass
    def ident(self):
        c=SimpleCookie();
        try: c.load(self.headers.get('Cookie',''))
        except Exception: pass
        token=c[COOKIE].value if COOKIE in c else ''
        uid=user_for(token)
        if uid: return uid,None
        return new_user()
    def sendx(self,status,body=b'',ctype='application/json; charset=utf-8',token=None,headers=None):
        self.send_response(status); self.send_header('X-Content-Type-Options','nosniff'); self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Cache-Control','no-store' if ctype.startswith('application/json') else 'public, max-age=60')
        if token: self.send_header('Set-Cookie',f'{COOKIE}={token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax')
        for k,v in (headers or {}).items(): self.send_header(k,v)
        self.send_header('Content-Type',ctype); self.send_header('Content-Length',str(len(body))); self.end_headers()
        if body: self.wfile.write(body)
    def js(self,status,obj,token=None): self.sendx(status,json.dumps(obj,ensure_ascii=False).encode(),'application/json; charset=utf-8',token)
    def static(self,p,token=None):
        c,_=mimetypes.guess_type(p.name); c=c or 'application/octet-stream'
        if c.startswith('text/') or c in ('application/javascript','application/json'): c+='; charset=utf-8'
        self.sendx(200,p.read_bytes(),c,token)
    def do_GET(self):
        u=urlparse(self.path); path=u.path
        if path=='/api/health': return self.js(200,{'ok':True})
        if path=='/api/me':
            uid,t=self.ident(); return self.js(200,{'shared':mine(uid)},t)
        if path=='/api/songs':
            uid,t=self.ident(); q=parse_qs(u.query).get('q',[''])[0]; return self.js(200,{'songs':search(q)},t)
        if path.startswith('/api/songs/'):
            uid,t=self.ident()
            try: sid=int(path.rsplit('/',1)[1])
            except: return self.js(404,{'error':'not_found'},t)
            s=fetch_song(sid); return self.js(200,s,t) if s else self.js(404,{'error':'not_found'},t)
        if path=='/':
            uid,t=self.ident(); p=safe(ROOT,'index.html'); return self.static(p,t)
        if path=='/sharing.js': return self.static(safe(ROOT,'sharing.js'))
        if path=='/mini': return self.sendx(302,b'','text/plain; charset=utf-8',headers={'Location':'/mini/'})
        if path.startswith('/mini/'):
            p=safe(MINI,path[len('/mini/'):])
            return self.static(p) if p else self.js(404,{'error':'not_found'})
        return self.js(404,{'error':'not_found'})
    def do_POST(self):
        if urlparse(self.path).path!='/api/share': return self.js(404,{'error':'not_found'})
        uid,t=self.ident()
        try:
            n=int(self.headers.get('Content-Length','0') or '0')
            if n<=0 or n>2_200_000: raise ValueError('length')
            p=json.loads(self.rfile.read(n).decode()); s=share(uid,p.get('title'),p.get('session'))
            return self.js(200,{'shared':s},t)
        except ValueError as e: return self.js(400,{'error':str(e)},t)
        except Exception: return self.js(400,{'error':'json'},t)
    def do_DELETE(self):
        if urlparse(self.path).path!='/api/share': return self.js(404,{'error':'not_found'})
        uid,t=self.ident()
        with LOCK, db() as c: c.execute('DELETE FROM shared_songs WHERE user_id=?',(uid,)); c.commit()
        return self.js(200,{'shared':None},t)

def main():
    init(); ThreadingHTTPServer((HOST,PORT),H).serve_forever()
if __name__=='__main__': main()
