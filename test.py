import json

import browser
from browser import document, ajax, html

from utils import bry_func, Elm, get
from Element import Element

def format_links(link_dict):
    link_list = ['<a class="pylink">{key}</a>'.format(key=key, value=value) for key, value in link_dict.items()]
    return '<br>'.join(link_list)

def format_json(json, pred=None, key='data'):

    if isinstance(json, dict):
        elm = CollList()
        elm.addClass('dict')
        elm.label.text = key

        for key, value in json.items():
            if value:
                format_json(value, elm, key)
            else:
                format_json(str(value), elm, key)

    elif isinstance(json, list):

        if json:
            elm = CollList()
            elm.addClass('list')
            elm.label.text = key

            for item in json:
                format_json(item, elm, str(json.index(item)))
        else:
            elm = Element()
            elm.text = key + ' : []'


    else:
        if type(json) == str:
            if 'https://' in json or 'http://' in json:
                elm = LinkBtn(key, json)
            else:
                elm = Element()
                elm.text = key + ' : ' + str(json)
                elm.set_style('display', 'block')

        else:
            elm = Element()

            elm.text = key + ' : ' + str(json)
            elm.set_style('display', 'block')

        elm.addClass('primative')

    pred.list_items.append(elm)


class Dismissible():

    def __init__(self, parent):
        self.parent = parent
        self.dismiss_btn = Elm('a')
        self.dismiss_btn.text = 'X'
        self.dismiss_btn.add_css_class('pull-right')
        self.dismiss_btn.bind('click', self.hide)
        parent.append(self.dismiss_btn)
        return self

    def hide(self, ev=None):
        self.parent.set_style('display', 'none')

class LinkBtn(Element):

    def __init__(self, label_txt, href):
        self.label = html.SPAN()
        self.label.text = label_txt

        self.link = html.A()
        self.link.text = " : " + href
        self.link.href = href

        self.btn_fetch = Element()
        self.btn_fetch.text = 'GET'
        self.btn_fetch.addClass('pull-right')
        self.btn_fetch.bind('click', self.get_json_call)

        self <= self.label
        self <= self.link
        self <= self.btn_fetch

    def get_json_call(self, ev):

        document['input'].value = self.link.href

        get_json_call()

class CollList(Element):

    def __init__(self, open=False, dissmissalbe=False):
        self.set_style('display', 'block')

        if dissmissalbe:
            Dismissible(self)

        self.open = open

        self.label = Element()
        self.label.bind('click', self.toggle)
        self <= self.label

        self.list_items = Element()
        self.list_items.set_style('padding', '5px')
        self <= self.list_items

        self.set_state()

    def toggle(self, ev=None):
        self.open = not self.open
        self.set_state()

    def set_state(self):

        if self.open:
            self.list_items.set_style('display', 'block')
        else:
            self.list_items.set_style('display', 'none')

document['input'].value = 'http://crossorigin.me/http://api.osf.io/v2/'

@bry_func
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


def get_json_call(ev=None):

    url = document['input'].value

    def on_complete(ev):
        print(req.status)
        if req.status == 0:
            document['input'].value = "http://crossorigin.me/" + document['input'].value
            url = document['input'].value
            req.open('GET', url, True)
            req.send()
        else:

            resp_obj = json.loads(req.text)

            list = CollList(dissmissalbe=True, open=True)
            list.addClass('call-head')
            list.label.text = document['input'].value  + " { ... }"
            list.closeText = document['input'].value + " { ... }"
            list.openText = document['input'].value + " { ..."

            format_json(resp_obj, list, document['input'].value)

            document['responses'].prepend(list.list_items)

    req = ajax.ajax()
    req.bind('complete', on_complete)
    # send a POST request to the url
    req.open('GET', url, True)
    req.set_header('content-type','application/x-www-form-urlencoded')
    # send data as a dictionary
    req.send()
    print(req)


document['enter'].bind('click', get_json_call)
