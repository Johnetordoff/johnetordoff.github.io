from browser import document, window, html


class Element(html.DIV):

    def __init__(self):
        pass
#        self.text = "HI"

    def set_style(self, property, value):
        setattr(self.style, property, value)

    def addClass(self, class_name):
        self.class_name += " " + class_name

    def removeClass(self, class_name):
        self.class_name = ' '.join(self.css_classes.remove(class_name))
