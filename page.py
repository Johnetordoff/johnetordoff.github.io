

import json

import browser
from browser import document, ajax, window

jq = window.jQuery


def format_links(link_dict):
    link_list = ['<a class="pylink">{key}</a>'.format(key=key, value=value) for key, value in link_dict.items()]
    return '<br>'.join(link_list)

def format_json(json, pred=None):

    for key, value in json.items():
        elm = document.createElement('span')
        setattr(elm.style, 'padding-left', "10px")
        elm.style.display = 'block'
        elm.py_key = "['{}']".format(key)
        elm.py_value = str(value)
        if isinstance(json[key], list):
            elm.text = key
            for dic in json[key]:
                list_div = document.createElement('span')
                list_div.py_key = '[{}]'.format(json[key].index(dic))
                setattr(list_div.style, 'padding-left', "10px")
                list_div.innerHTML = str(json[key].index(dic))
                list_div.style.display = 'block'
                format_json(dic, list_div)
                elm.appendChild(list_div)
            elm.bind('click', collaspe)
            elm.class_name += ' list'
        elif isinstance(json[key], dict):
            elm.class_name += ' dict'
            elm.text = key
            format_json(json[key], elm)

        else:
            elm.text = key + ' : ' + str(value)
            elm.class_name += ' primative'

        elm.bind('click', dispy)
        pred.appendChild(elm)

def dispy(ev):
    elm = ev.target
    msg = ''
    while hasattr(elm, 'parent') and hasattr(elm, 'py_key'):
        msg = elm.py_key + msg
        elm = elm.parent
    document['path'].text = 'data{msg}'.format(msg=msg)

document['input'].value = 'http://api.fantasy.nfl.com/v1/game/stats?format=json'


def collaspe(ev):
    elm = ev.target

    if hasattr(elm, "collasped") and elm.collasped:
        for child in elm.children:
            child.style.display = 'block'
            elm.appendChild(child)
            setattr(child.style, 'padding-left', "10px")
        elm.collasped = False

    else:
        for child in elm.children:
            child.style.display = 'none'
            setattr(child.style, 'padding-left', "0px")
            elm.appendChild(child)
        elm.collasped = True

"""

def main_page():
    url = 'http://api.fantasy.nfl.com/v1/game/stats?format=json'
    url = 'http://api.github.com'
    resp_obj = read(url)
    browser.console.log(resp_obj)
    resp_obj = json.loads(resp_obj)
    format_json(resp_obj, document.body)

#    document["result"].html = resp_obj['meta']['message'] + '<br>' * 2 + format_links(resp_obj['links'])


def read(url):
    return open(url).read()


#main_page()
doc = Document(document)
def counter(ev):
    browser.console.log(ev.__class___)
    doc['score'].text = int(doc['score'].text) + ev.target.counter
    ev.target.counter += 1
    ev.target.text = ev.target.counter
    new_link = doc.createElement('a')
    new_link.style.position = 'absolute'
    new_link.text = ev.target.counter
    new_link.counter =  ev.target.counter
    doc.body.appendChild(new_link)
    new_link.bind('click', doc.funcs['counter'])
    for link in doc.get(selector='.pylink'):
        link.style.left = random.randint(0, doc.documentElement.clientWidth)
        link.style.top = random.randint(0, doc.documentElement.clientHeight)


doc.funcs['counter'] = counter

for link in doc.get(selector='.pylink'):
    link.bind('click', counter)
    link.style.position = 'absolute'
    link.counter = 0

"""


def get(ev):
    def on_complete(ev):
        if req.status == 200:
            resp_obj= json.loads(req.text)
            if type(resp_obj) == list:
                resp_obj = {'items' : resp_obj}

            format_json(resp_obj, document.body)
        elif req.status == 501:
            url = 'http://crossorigin.me/' + document['input'].value
            req.bind('complete', on_complete)
            req.open('GET', url, True)
            # send data as a dictionary
            req.send()
        else:
            document['path'].text = "{} : {}".format(req.status, req.text)

    url = document['input'].value
    req = ajax.ajax()
    req.bind('complete',on_complete)
    req.open('GET', url, True)
    # send data as a dictionary
    req.send()


document['enter'].bind('click', get)
def keydown(env):
    print(env.which)
    jq(document['play']).addClass('animated slideInLeft')

document.addEventListener('keydown', lambda x: keydown(x))
