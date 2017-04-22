import json

from browser import document, ajax, html

from Element import Element

class Shelob(Element):

    def __init__(self, items):

        for json_item in ite:
            self <= Item(json_item)

class Item(Element):

    def __init__(self, file_json):
        self.label = Element()
        self.label.text = file_json['attributes']['name']
        self <= self.label

        self.list_items = Element()

        self.expanded = False
        self.set_style('padding-left', '10px')

        if file_json['attributes']['kind'] == 'folder':
            self.label.text += ' +'
            self.link = file_json['relationships']['files']['links']['related']['href']
            self.label.bind('click', self.open)

    def on_complete(self, req=None):
        self.label.text = self.label.text[:-1] + '-'
        resp_obj = json.loads(req.text)
        for item in resp_obj['data']:
            item = Item(item)
            self.list_items <= item
        self <= self.list_items

        self.expanded = True


    def open(self, ev=None):

        if not self.expanded and not len(self.list_items.children):
            req = ajax.ajax()
            req.bind('complete', self.on_complete)
            # send a POST request to the url
            req.open('GET', 'http://crossorigin.me/' + self.link, True)
            req.set_header('content-type', 'application/x-www-form-urlencoded')
            # send data as a dictionary
            req.send()

            self.label.text = self.label.text[:-1] + '?'
        elif not self.expanded and len(self.list_items.children):
            for x in self.list_items.children:
                x.style.display = 'block'
            self.label.text = self.label.text[:-1] + '-'
            self.expanded = True
        else:
            for x in self.list_items.children:
                x.style.display = 'none'
            self.label.text = self.label.text[:-1] + '+'
            self.expanded = False


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

        else:
            elm = Element()
            elm.text = key + ' : ' + str(json)

        elm.addClass('primative')

    pred.list_items.append(elm)

class Dismissible(html.A, Element):

    def __init__(self, parent):
        self.parent = parent
        self.text = 'X'
        self.addClass('pull-right')
        self.bind('click', self.hide)
        return self

    def hide(self, ev=None):
        self.style.display = 'none'

class LinkBtn(Element):

    def __init__(self, label_txt, href):
        self.label = Element()
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

    def __init__(self, open=False):

        self.set_style('display', 'block')

        self.open = open

        self.label = Element()
        self.label.addClass('btn')
        self.label.set_style('text-align', 'left')
        self.label.set_style('width', '100%')

        self.label.bind('click', self.toggle)
        self <= self.label

        self.list_items = Element()
        self.list_items.set_style('padding-left', '20px')
        self <= self.list_items

        self.set_state()

    def toggle(self, ev=None):
        self.open = not self.open
        self.set_state()

    def make_dissmissable(self, ev=None):
        self.open = not self.open
        self.set_state()

    def set_state(self):

        if self.open:
            self.list_items.set_style('display', 'block')
        else:
            self.list_items.set_style('display', 'none')

def get_json_call(ev=None):

    url = document['input'].value

    def on_complete(ev):
        print(req.status)
        if req.status == 0:
            document['input'].value = "http://crossorigin.me/" + document['input'].value
            url = document['input'].value
            req.open('GET', url, True)
            req.send()
        elif req.status != 200:

            coll_lst = CollList(dissmissalbe=True, open=True)
            coll_lst.make_draggable()
            coll_lst.label.text = document['responses'].text
            pre = html.PRE()
            coll_lst.addClass('call-head')
            coll_lst.label.text = 'HTTP code: {} | {}'.format(req.status, document['input'].value)
            coll_lst.label.addClass('btn')

            pre.text = req.text

            coll_lst.list_items <= pre

            document['responses'].prepend(coll_lst)

        else:

            resp_obj = json.loads(req.text)

            coll_lst = CollList(dissmissalbe=True)
            coll_lst.make_draggable()
            coll_lst.addClass('call-head')
            coll_lst.list_items.set_style('padding-left', '0px')

            coll_lst.label.text = 'HTTP code: {} | {}'.format(req.status, document['input'].value)

            format_json(resp_obj, coll_lst, 'data')

            document['responses'].prepend(coll_lst)

    req = ajax.ajax()
    req.bind('complete', on_complete)
    # send a POST request to the url
    req.open('GET', url, True)
    req.set_header('content-type','application/x-www-form-urlencoded')
    # send data as a dictionary
    req.send()
    print(req)

def Shelob_get(ev=None):

    url = document['input'].value

    def on_complete(ev):
        print(req.status)

        resp_obj = json.loads(req.text)
        shelob = Shelob(resp_obj)
        document['responses'] <= shelob

    req = ajax.ajax()
    req.bind('complete', on_complete)
    # send a POST request to the url
    req.open('GET', url, True)
    req.set_header('content-type','application/x-www-form-urlencoded')
    # send data as a dictionary
    req.send()

