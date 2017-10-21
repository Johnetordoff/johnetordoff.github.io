from browser import html

print((html.DIV))



class Element(object):

    def __init__(self):
        pass
        #self.bind('click', self.clicked)
        #self.bind('mouseenter', self.mouse_enter)
        #self.bind('mouseleave', self.mouse_leave)

    def clicked(self, env):  # click is a keyword... kinda
        pass

    def set_style(self, css_property, value):
        self.style = {css_property: value}

    def set_inner_text(self, text):
        self.textContent = text

    def merge(self, obj):
        for key, value in obj.__dict__.items():
            self.setAttribute(key, value)

    @property
    def py_style(self):
        return js_object_to_dict(self.style.js)

    @py_style.setter
    def py_style(self, value):
        self.style = value

    @property
    def css_classes(self):
        return [cls for cls in self.class_name.split(' ')]

    def mouse_enter(self, env):
        self.prehover_style = self.py_style
        #self.set_bg_color((255, 0, 255))

    def mouse_leave(self, env):
        self.py_style = self.prehover_style
        print("?")

    def add_class(self, class_name):
        css_classes = self.css_classes
        css_classes.append(class_name)
        self.class_name = ' '.join(css_classes)
        return self

    def remove_class(self, class_name):
        css_classes = self.css_classes
        css_classes.remove(class_name)
        self.class_name = ' '.join(css_classes)

    def make_draggable(self):
        self.set_style('position', 'absolute')
        self.draggable = True
        self.bind('dragstart', self.drag_start)
        self.bind('drag', self.drag)
        self.bind('drop', self.drop)
        self.bind('dragend', self.drag_end)
        self.offset = (0, 0)

    def set_bg_color(self, color):
        self.set_style('background-color', 'rgb{}'.format(color))

    def set_color(self, color):
        self.set_style('color', 'rgb{}'.format(color))

    def drag(self, ev):

        offsetX, offsetY = self.offset
        if ev.clientX:
            self.style.left = '{}px'.format(ev.clientX - offsetX)
            self.style.top = '{}px'.format(ev.clientY - offsetY)

    def drag_end(self, ev):

        rect = self.getBoundingClientRect()
        if ev.clientX:
            self.style.left = '{}px'.format(rect.left - 10)
            self.style.top = '{}px'.format(rect.top - 10)

    def drag_start(self, ev):
        self.offset = (ev.layerX + 10, ev.layerY + 10)

    def drop(self, ev):

        offsetX, offsetY = self.offset
        self.style.left = "{}px".format(ev.clientX - offsetX)
        self.style.top = "{}px".format(ev.clientY - offsetY)

class JQUI(Element):
    pass

class A(Element, html.A):
    pass

class DIV(Element, html.DIV):
    pass

class P(Element, html.P):
    pass

class UL(Element, html.UL):
    pass

class LI(Element, html.LI):
    pass


def js_object_to_dict(js_object):

    keys = [key.replace('-','_' ) for key in dir(js_object)]

    dict = {}
    for key in keys:
        dict[key] = getattr(js_object, key, None)
    return dict