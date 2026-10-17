(function () {
  "use strict";
  var STORAGE_KEY = "cellbeat-mini-beta:saved-songs:v1";
  var frame = document.getElementById("trackerFrame");
  var titleInput = document.getElementById("titleInput");
  var mySongs = document.getElementById("mySongs");
  var myMessage = document.getElementById("myMessage");
  var sharedNow = document.getElementById("sharedNow");
  var searchInput = document.getElementById("searchInput");
  var searchResults = document.getElementById("searchResults");
  var searchMessage = document.getElementById("searchMessage");
  var remoteCache = Object.create(null);

  function message(node, text, error) {
    node.textContent = text || "";
    node.dataset.error = error ? "true" : "false";
  }

  function loadLibrary() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(function (item) {
        return item && typeof item.id === "string" && typeof item.title === "string" && typeof item.session === "string";
      }) : [];
    } catch (error) { return []; }
  }

  function saveLibrary(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  function makeId() { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); return String(Date.now()) + "-" + Math.random().toString(36).slice(2); }
  function cleanTitle(value) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80); }

  function api(path, options) {
    options = options || {}; options.headers = options.headers || {};
    if (options.body && !options.headers["Content-Type"]) options.headers["Content-Type"] = "application/json";
    return fetch(path, options).then(function (response) {
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : {};
        if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));
        return data;
      });
    });
  }

  function tracker() {
    var win = frame.contentWindow, doc = frame.contentDocument;
    if (!win || !doc || !doc.getElementById("savePatternBtn")) throw new Error("Tracker is still loading.");
    return {win: win, doc: doc};
  }

  function resizeTrackerFrame() {
    var t;
    try { t = tracker(); } catch (error) { return; }
    var doc = t.doc;
    var height = Math.max(
      doc.body ? doc.body.scrollHeight : 0,
      doc.documentElement ? doc.documentElement.scrollHeight : 0
    );
    if (height > 0) frame.style.height = (height + 4) + "px";
  }

  function installTrackerBetaUX() {
    var t;
    try { t = tracker(); } catch (error) { return; }
    var doc = t.doc, win = t.win, grid = doc.getElementById("grid");
    if (!grid) return;

    var playButton = doc.getElementById("playBtn");
    var demoButton = doc.getElementById("demoBtn");
    if (playButton) playButton.setAttribute("aria-label", "Play or stop the loaded song");
    if (demoButton) {
      demoButton.textContent = "Reload Default Song";
      demoButton.setAttribute("aria-label", "Reload the default song and start playback");
    }

    if (!doc.getElementById("cellbeatMiniBetaUXStyle")) {
      var style = doc.createElement("style");
      style.id = "cellbeatMiniBetaUXStyle";
      style.textContent = "#programDialog{padding:12px 14px 14px!important;width:min(420px,calc(100vw - 20px))!important;margin:auto}#programDialog form{display:grid;gap:8px}#programDialog h2,#programDialog p{margin:0;overflow-wrap:anywhere}#programDialog .program-rule{margin:0;gap:8px}#programDialog .actions{margin-top:2px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#programDialog .actions .btn{min-width:0}.channel-table th,.channel-table td{overflow:hidden;text-overflow:ellipsis}.tools .btn{overflow-wrap:anywhere}@media(max-width:430px){.channel-table{font-size:9px}.channel-table th,.channel-table td{padding:2px 1px}.tools .btn{font-size:9px}}";
      doc.head.appendChild(style);
    }

    resizeTrackerFrame();
    if (!frame._cellbeatResizeObserver && win.ResizeObserver) {
      frame._cellbeatResizeObserver = new win.ResizeObserver(function () { resizeTrackerFrame(); });
      if (doc.documentElement) frame._cellbeatResizeObserver.observe(doc.documentElement);
      if (doc.body) frame._cellbeatResizeObserver.observe(doc.body);
    }
    win.setTimeout(resizeTrackerFrame, 60);
    win.setTimeout(resizeTrackerFrame, 300);

    if (grid.dataset.betaDoubleClickProgramming === "true") return;
    grid.dataset.betaDoubleClickProgramming = "true";
    var pendingCell = null, pendingTimer = null;

    function controlCell(cell) {
      if (!cell || !cell.classList || !cell.classList.contains("cell")) return false;
      var type = cell.dataset.type || "";
      return type && ["empty", "tone", "sample"].indexOf(type) < 0;
    }

    function replayClick(cell) {
      if (!cell || !cell.isConnected) return;
      var event = new win.MouseEvent("click", {bubbles:true, cancelable:true, view:win, detail:1});
      event.__cellbeatBetaReplay = true;
      cell.dispatchEvent(event);
    }

    function clearPending() {
      if (pendingTimer) win.clearTimeout(pendingTimer);
      pendingTimer = null; pendingCell = null;
    }

    function openProgramming(cell) {
      clearPending();
      var programButton = doc.getElementById("programToolBtn");
      if (!programButton) return;
      if (programButton.getAttribute("aria-pressed") !== "true") programButton.click();
      replayClick(cell);
      win.setTimeout(resizeTrackerFrame, 20);
    }

    grid.addEventListener("click", function (event) {
      if (event.__cellbeatBetaReplay) return;
      var cell = event.target.closest ? event.target.closest(".cell") : null;
      if (!controlCell(cell) || !grid.contains(cell)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (pendingTimer && pendingCell === cell) {
        openProgramming(cell);
        return;
      }
      if (pendingTimer && pendingCell && pendingCell !== cell) replayClick(pendingCell);
      clearPending();
      pendingCell = cell;
      pendingTimer = win.setTimeout(function () {
        var target = pendingCell;
        clearPending();
        replayClick(target);
      }, 240);
    }, true);

    grid.addEventListener("dblclick", function (event) {
      var cell = event.target.closest ? event.target.closest(".cell") : null;
      if (!controlCell(cell) || !grid.contains(cell)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (pendingCell === cell) openProgramming(cell);
    }, true);
  }

  function captureCurrentSession() {
    var t = tracker(), captured = null;
    var oldCreate = t.win.URL.createObjectURL, oldClick = t.win.HTMLAnchorElement.prototype.click;
    t.win.URL.createObjectURL = function (blob) { captured = blob; return oldCreate.call(t.win.URL, blob); };
    t.win.HTMLAnchorElement.prototype.click = function () {};
    try { t.doc.getElementById("savePatternBtn").click(); }
    finally { t.win.URL.createObjectURL = oldCreate; t.win.HTMLAnchorElement.prototype.click = oldClick; }
    if (!captured) return Promise.reject(new Error("Could not capture the current song."));
    return captured.text();
  }

  function loadIntoTracker(session, tryPlay) {
    var t = tracker(), input = t.doc.getElementById("patternFile");
    var file = new t.win.File([session], "Cellbeat-Mini-shared.json", {type: "application/json"});
    var dt = new t.win.DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new t.win.Event("change", {bubbles: true}));
    frame.scrollIntoView({behavior: "smooth", block: "start"});
    if (tryPlay) window.setTimeout(function () { var play = t.doc.getElementById("playBtn"); if (play) play.click(); }, 180);
    window.setTimeout(resizeTrackerFrame, 220);
  }

  function saveCurrent() {
    var songName = frame.contentDocument && frame.contentDocument.getElementById("songName");
    var title = cleanTitle(titleInput.value || (songName ? songName.value : ""));
    if (!title) { message(myMessage, "Give the song a title first.", true); return; }
    message(myMessage, "Saving current song…");
    captureCurrentSession().then(function (session) {
      var items = loadLibrary(); items.unshift({id: makeId(), title: title, session: session, savedAt: new Date().toISOString()});
      saveLibrary(items); titleInput.value = ""; renderLibrary(); message(myMessage, "Saved in this browser.");
    }).catch(function (error) { message(myMessage, error.message, true); });
  }

  function renderLibrary() {
    var items = loadLibrary(); mySongs.textContent = "";
    if (!items.length) { mySongs.innerHTML = '<div class="empty">No saved beta songs yet.</div>'; return; }
    items.forEach(function (item) {
      var row = document.createElement("div"); row.className = "song";
      var info = document.createElement("div"), strong = document.createElement("strong"), small = document.createElement("small");
      strong.textContent = item.title; small.textContent = item.savedAt ? "Saved " + new Date(item.savedAt).toLocaleString() : "Saved locally";
      info.appendChild(strong); info.appendChild(small);
      var actions = document.createElement("div"); actions.className = "actions";
      function button(label, fn, primary) { var b=document.createElement("button"); b.type="button"; b.className="btn"+(primary?" primary":""); b.textContent=label; b.addEventListener("click",fn); actions.appendChild(b); }
      button("Load", function () { try { loadIntoTracker(item.session, false); message(myMessage, "Loaded “" + item.title + "”."); } catch (error) { message(myMessage,error.message,true); } });
      button("Share", function () {
        message(myMessage, "Sharing “" + item.title + "”…");
        api("/api/share", {method:"POST", body:JSON.stringify({title:item.title, session:item.session})}).then(function (data) {
          showShared(data.shared); message(myMessage, "Shared. This replaces your previous shared song."); search();
        }).catch(function (error) { message(myMessage, "Could not share: " + error.message, true); });
      }, true);
      button("Delete", function () { saveLibrary(loadLibrary().filter(function(x){return x.id!==item.id;})); renderLibrary(); message(myMessage,"Deleted local copy."); });
      row.appendChild(info); row.appendChild(actions); mySongs.appendChild(row);
    });
  }

  function showShared(shared) { sharedNow.textContent = shared ? "Your shared song: “" + shared.title + "”" : "You are not sharing a song yet."; }
  function refreshMe() { api("/api/me").then(function (data) { showShared(data.shared); }).catch(function () { sharedNow.textContent = "Could not check shared song."; }); }
  function getRemote(id) { if (remoteCache[id]) return Promise.resolve(remoteCache[id]); return api("/api/songs/" + encodeURIComponent(id)).then(function (song) { remoteCache[id] = song; return song; }); }

  function renderSearch(songs) {
    searchResults.textContent = "";
    if (!songs.length) { searchResults.innerHTML = '<div class="empty">No shared songs found.</div>'; return; }
    songs.forEach(function (song) {
      var row=document.createElement("div"); row.className="song";
      var info=document.createElement("div"), strong=document.createElement("strong"), small=document.createElement("small"); strong.textContent=song.title; small.textContent="Shared song"; info.appendChild(strong); info.appendChild(small);
      var actions=document.createElement("div"); actions.className="actions";
      function button(label, fn, primary){var b=document.createElement("button");b.type="button";b.className="btn"+(primary?" primary":"");b.textContent=label;b.addEventListener("click",fn);actions.appendChild(b);}
      button("Hear", function () { message(searchMessage,"Loading “"+song.title+"”…"); getRemote(song.id).then(function(full){ loadIntoTracker(full.session,true); message(searchMessage,"Loaded “"+song.title+"” into the tracker."); }).catch(function(error){message(searchMessage,"Could not load: "+error.message,true);}); }, true);
      button("Copy", function () { message(searchMessage,"Copying “"+song.title+"”…"); getRemote(song.id).then(function(full){var items=loadLibrary();items.unshift({id:makeId(),title:full.title,session:full.session,savedAt:new Date().toISOString()});saveLibrary(items);renderLibrary();message(searchMessage,"Copied to My saved songs.");}).catch(function(error){message(searchMessage,"Could not copy: "+error.message,true);}); });
      row.appendChild(info); row.appendChild(actions); searchResults.appendChild(row);
    });
  }

  function search() {
    var q = cleanTitle(searchInput.value); message(searchMessage,"Searching…");
    api("/api/songs?q="+encodeURIComponent(q)).then(function(data){renderSearch(data.songs||[]);message(searchMessage,(data.songs||[]).length+" shared song"+((data.songs||[]).length===1?"":"s")+" found.");}).catch(function(error){message(searchMessage,"Search failed: "+error.message,true);});
  }

  document.getElementById("saveCurrentBtn").addEventListener("click", saveCurrent);
  document.getElementById("searchBtn").addEventListener("click", search);
  searchInput.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); search(); } });
  frame.addEventListener("load", function () { installTrackerBetaUX(); resizeTrackerFrame(); message(myMessage, "Tracker ready."); });
  window.addEventListener("resize", resizeTrackerFrame);
  if (frame.contentDocument && frame.contentDocument.readyState === "complete") { installTrackerBetaUX(); resizeTrackerFrame(); }
  renderLibrary(); refreshMe(); search();
}());
