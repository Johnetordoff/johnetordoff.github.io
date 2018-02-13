import base64
from PIL import Image

with open("static/img/light-blue.png", "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read())
    print(encoded_string)

print(len(encoded_string))

#foo = Image.open("static/img/Bednarik_alpha-min 5.png", "r")

#foo.save("static/img/Bednarik_alpha-min 6.png",optimize=True,quality=1)