from PIL import Image
import sys

def dump(fn, y0, y1, step=1, x0=0, x1=642):
    im = Image.open(fn).convert('RGB')
    for y in range(y0, y1, step):
        row = []
        for x in range(x0, x1):
            c = im.getpixel((x, y))
            row.append('#' if c != (0,0,0) else '.')
        s = ''.join(row)
        print(f'{y:3d}: {s}')
    print()

for fn in sys.argv[1:]:
    print('=====', fn)
    dump(fn, 320, 352)