import browser
from browser import document, ajax

def bry_func(func):

    def wrapper(*args, **kwargs):

        print(args)
        print(kwargs)

        return func(*args, **kwargs)

    return wrapper


def get(func):

    req = ajax.ajax()
    req.bind('complete', func)
    req.open('GET', a, True)
    req.set_header('content-type', 'application/x-www-form-urlencoded')
    req.send()

    func(*args, **kwargs)

class Elm():

    def __init__(self, tag=None, elm=None):
        if tag:
            self.elm = document.createElement(tag)
        if elm:
            self.elm = elm
        self.elm._self = self

    def append(self, node):
        if type(node) == Elm:
            self.elm.appendChild(node.elm)
        else:
            raise Exception('Can\'t append non-node to node')

    def remove(self, node):
        if type(node) == Elm:
            self.elm.removeChild(node.elm)
        else:
            raise Exception('Can\'t remove non-node to node')

    def bind(self, event, func):
        self.elm.bind(event, func)

    def unbind(self, event, func):
        self.elm.unbind(event, func)

    @property
    def css_classes(self):
        return self.elm.class_name.split(' ')

    def add_css_class(self, class_name):
        self.elm.class_name += " " + class_name

    def remove_css_class(self, class_name):
        self.elm.class_name = ' '.join(self.css_classes.remove(class_name))

    @property
    def children(self):
        return [x._self for x in self.elm.children]

    def set_style(self, property, value):
        setattr(self.elm.style, property, value)

    @property
    def innerHTML(self, value):
        getattr(self.elm.text, value)

    def set_innerHTML(self, value):
        self.elm.text = value


    def __eq__(self, other):
        if type(other) == Elm:
            return other.elm == self.elm
        else:
            return False


"""

class CollList(elm):

    def __init__(self, open=False):
        self.self = document.createElement('span')

        self.open = open
        self.openText = 'open'
        self.closeText = 'close'

        self.label = document.createElement('span')
        self.label.bind('click', self.toggle)
        self.self.appendChild(self.label)

        self.elm = document.createElement('span')
        setattr(self.elm.style, 'padding-left', '10px')
#        self.elm.self.bind('click', self.toggle)
        self.self.appendChild(self.elm)

        self.toggle(ev=None)
        self.toggle(ev=None)

    def toggle(self, ev):

        if self.open:
            self.label.text = self.openText
            self.elm.style.display = 'none'
        else:
            self.label.text = self.closeText
            self.elm.style.display = 'block'

        self.open = not self.open

py_lst = CollList()
py_lst.label.text = "Click"

document.body.appendChild(py_lst.self)

link = document.createElement('div')
link.text = 'AAAADDKD'

link2 = document.createElement('div')
link2.text = '2'

link3 = document.createElement('div')
link3.text = '3'

py_lst.elm.appendChild(link)
py_lst.elm.appendChild(link2)

py_lst2 = CollList()
py_lst2.elm.appendChild(link3)

py_lst.elm.appendChild(py_lst2.self)
"""