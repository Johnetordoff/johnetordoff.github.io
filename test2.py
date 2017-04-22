from browser import document, alert, html, window

from jqueryui import jq
from tabs import Tabs

__BRYTHON__.imports()

iframe = html.IFRAME()
iframe.id = "iframe0"
iframe.src = 'https://mfr.osf.io/render?url=https://osf.io/dawsg/?action=download%26mode=render'
iframe.style.width = '100%'
iframe.style.height = '1500px'

def print_0():
    print("???")


#iframe.onload = print_0

tabs = Tabs('tabs')
tabs.add_tab('label 1', 'content 1')
tabs.add_tab('Gdrive', iframe)

document.body <= tabs


jq["tabs"].tabs()
jq["tabs2"].tabs()


window.addEventListener('ready', print_0, True)
