import os
from PIL import Image

base = r'C:\Users\ericl\AppData\Local\Temp\opencode\og'
for name in ['win95_level1.png', 'win95_level2.png']:
    f = os.path.join(base, name)
    if not os.path.exists(f):
        print('MISSING', name)
        continue
    im = Image.open(f).convert('RGB')
    sx = im.width / 320.0
    sy = im.height / 200.0
    print('=== %s (%dx%d) ===' % (name, im.width, im.height))
    for y in range(170, 200):
        row = ''
        for x in range(125, 215):
            r, g, b = im.getpixel((int(round(x * sx)), int(round(y * sy))))
            if g > 100 and r < 120 and b < 120: row += 'G'
            elif r > 180 and g > 170 and b > 170: row += 'W'
            elif r > 120 and g > 120 and b < 120: row += 'Y'
            elif r + g + b > 120: row += 'o'
            else: row += '.'
        print(' y%3d %s' % (y, row))
    print()