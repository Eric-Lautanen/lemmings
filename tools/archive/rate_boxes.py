import base64
from PIL import Image

src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()
i = src.find('"panel"'); j = src.find('"', i + 8); k = src.find('"', j + 1)
panel = base64.b64decode(src[j + 1:k])
vals = [[(panel[(y * 320 + x) // 2] >> (4 * (1 - (x % 2)))) & 15 for x in range(320)] for y in range(40)]

for name, x0, x1 in (('upbox', 129, 144), ('digitbox', 144, 161), ('downbox', 161, 177), ('nuke', 177, 209)):
    print('=== %s panel values x%d..%d ===' % (name, x0, x1 - 1))
    for y in range(15, 40):
        print('y%d %s' % (160 + y, ''.join(str(vals[y][x]) for x in range(x0, x1))))

for name, x0, x1 in (('upbox', 129, 144), ('digitbox', 144, 161), ('downbox', 161, 177)):
    print('=== %s capture v004 ===' % name)
    im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
    for y in range(175, 200):
        row = ''
        for x in range(x0, x1):
            r, g, b = im.getpixel((x, y))
            if g > 120 and r < 100 and b < 100: row += 'G'
            elif r > 200 and g > 190 and b > 190: row += 'W'
            elif r > 130 and g > 130 and b < 100: row += 'Y'
            elif r > 180 and g > 170 and b > 170: row += 'o'
            else: row += '.'
        print('y%d %s' % (y, row))