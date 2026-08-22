from PIL import Image
from collections import Counter
import sys

def analyze(fn):
    im = Image.open(fn).convert('RGB')
    w, h = im.size
    print(f'== {fn} {im.size}')
    for y in range(h):
        row = [im.getpixel((x, y)) for x in range(0, w, 2)]
        c = Counter(row)
        top = c.most_common(3)
        frac = top[0][1] / len(row)
        if frac > 0.97 or (y % 5 == 0):
            print(f'  y={y:3d} top3={[(col, n) for col, n in top]} frac={frac:.2f}')
    print()

for fn in sys.argv[1:]:
    analyze(fn)