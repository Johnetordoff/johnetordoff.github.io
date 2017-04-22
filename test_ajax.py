from browser import document, ajax

def on_complete(req):
    print(req.status)
    print(req.text)



req = ajax.ajax()
req.bind('complete',on_complete)
# send a POST request to the url
req.open('get','https://test.com',True)
req.set_header('content-type','application/x-www-form-urlencoded')
# send data as a dictionary
req.send({'x':0, 'y':1})