import os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def isgreen(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

for fn in ['pa_0e8.png', 'pa_1d6.png']:
    im = Image.open(os.path.join(d, fn)).convert('RGB')
    w, h = im.size
    px = im.load()
    print('####', fn, w, 'x', h)
    # row density wholesale
    for y in range(0, h, 10):
        n = sum(1 for x in range(0, w) for dy in range(0, min(10, h - y)) if isgreen(px, x, y + dy))
        if n > 60:
            print('  rows %3d..%3d: green=%d' % (y, min(y + 9, h - 1), n))
    print()