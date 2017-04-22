from Element import Element, UL, LI, A, DIV, P
from jqueryui import jq


class Tabs(DIV):

    def __init__(self, id):
        self.id = id
        self.list = UL() # .add_class('ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all"')
        self <= self.list

    def add_tab(self, label, content):
        tab = Tab(label, content)
        self.list <= tab
        self <= tab.panel

class Tab(LI):

    def __init__(self, label, content):

        self.label = A()
        self.label.textContent = label

        self.panel = DIV()
        self.text0 = P()
        if type(content)  == str:
            self.text0.textContent = content
        else:
            self.panel <= content

        self.panel <= self.text0

        self.panel.id = 'tabs-{}'.format(str(id(self)))
        self.label.href = '#tabs-{}'.format(str(id(self)))

        self <= self.label

