import browser
from browser import document, alert, html, window, ajax
from jqueryui import jq
from tabs import Tabs, JQUI
from Element import manager

iframe = html.IFRAME()
iframe.id = "iframe0"
iframe.src = 'https://mfr.osf.io/render?url=https://osf.io/dawsg/?action=download%26mode=render'
iframe.style.width = '100%'
iframe.style.height = '1500px'

welcome_msg = 'Please excuse the unkept nature of this site. I am using to test Brython.'


tabs = Tabs('tabs')
tabs.add_tab('Welcome', welcome_msg)

tabs2 = Tabs('tabs2')
tabs2.add_tab('File', iframe)
tabs2.add_tab('Folder', iframe.clone())

tabs.add_tab('Gdrive', tabs2)

document.body <= tabs




for var in locals(): # bind all
    obj = eval(var)
    cls = obj.__class__
    if JQUI in cls.__mro__:
        getattr(jq[obj.id], obj.__class__.__name__.lower())()

iframe.onload = lambda x : print(iframe.contentWindow.document.body.height)

window.jQuery(document).ready(lambda x : print('ready'))
