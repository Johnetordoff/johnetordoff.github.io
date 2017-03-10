import browser

print(dir(browser))

__dict__ = {}
for key in dir(browser):
    __dict__[key] = getattr(browser, key)

browser2 = type('brow', (), __dict__)

class Browser(browser2):
    pass


