from browser import document, window

__dict__ = {}
for key in dir(document):
    __dict__[key] = getattr(document, key)

document2 = type('doc', (), __dict__)

class Document(document2):

    mouseCoords2 = (0, 0)


    def __init__(self, document):
        pass


def print2(self, ev):
    print(self)
    #self.mouseCoords2 = (ev.x, ev.y)

def mouseCoords(ev, objs):
    objs.mouseCoords2 = (ev.x, ev.y)
    return (ev.x, ev.y)

