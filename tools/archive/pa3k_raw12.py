from PIL import Image
import sys

def dump12x22(fn, gx, y0=328):
    im = Image.open(fn).convert('RGB')
    rows = []
    for yy in range(22):
        row = ''.join('#' if im.getpixel((2*gx+1+xx, y0+yy)) != (0,0,0) else '.' for xx in range(12))
        rows.append(row)
    return rows

for fn in sys.argv[1:]:
    im = Image.open(fn).convert('RGB')
    for name, gx in [('B1',145),('F1',289),('F3',305),('F4',313),('D1',209),('E4',273)]:
        print(f'== {fn} {name} gx={gx}')
        for r in dump12x22(fn, gx):
            print('   ' + r)
        print()