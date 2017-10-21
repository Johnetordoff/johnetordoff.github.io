from Element import Element, UL, LI, A, DIV, P, JQUI
from jqueryui import jq


class Tabs(DIV, JQUI):

    def __init__(self, id):
        #self.set_style('background-color', 'lightgreen')
        self.id = id
        self.list = UL()
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
        self.panel.set_style('padding', '1px')


        self.panel.id = 'tabs-{}'.format(str(id(self)))
        self.label.href = '#tabs-{}'.format(str(id(self)))

        self <= self.label

