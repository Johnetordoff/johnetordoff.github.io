import browser
from browser import document, alert, html, window
from jqueryui import jq
from tabs import Tabs

iframe = html.IFRAME()
iframe.id = "iframe0"
iframe.src = 'https://mfr.osf.io/render?url=https://osf.io/dawsg/?action=download%26mode=render'
iframe.style.width = '100%'
iframe.style.height = '1500px'

def printX():
    print("???")


#iframe.onload = print_0

welcome_msg = 'Please excuse the unkept nature of this site. I am using to test Brython.'

tabs = Tabs('tabs')
tabs2 = Tabs('tabs2')
tabs2.add_tab('File', iframe)
tabs2.add_tab('Folder', iframe.clone())

tabs.add_tab('Welcome', welcome_msg)
tabs.add_tab('Gdrive', tabs2)

document.body <= tabs

jq["tabs"].tabs()
jq["tabs2"].tabs()

iframe.onload = lambda x : print(iframe.contentWindow.document.body.height)

window.jQuery(document).ready(lambda x : print('ready'))
