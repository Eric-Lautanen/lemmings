from PIL import Image
from collections import Counter
import sys

def scan(fn, y0, y1):
    im = Image.open(fn).convert('RGB')
    w, h = im.size
    print(f'== {fn} {im.size}')
    for y in range(y0, min(y1, h)):
        row = [im.getpixel((x, y)) for x in range(2*110, 2*320)]
        c = Counter(row)
        frac = c.most_common(1)[0][1] / len(row)
        mark = ' <--' if frac > 0.85 else ''
        print(f'  y={y:3d} frac={frac:.2f} top={c.most_common(1)[0][0]}{mark}')
    print()

for fn in sys.argv[1:]:
    scan(fn, 300, 401)