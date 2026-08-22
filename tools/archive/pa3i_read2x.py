from PIL import Image
import sys

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]
def read2x(im, gx, y0=328, dx0=1):
    rows = []
    for yy in range(11):
        row = []
        for xx in range(6):
            px = 2*gx + dx0 + 2*xx
            c = im.getpixel((px, y0+2*yy))
            row.append(c)
        rows.append(row)
    return rows

def main(fn):
    im = Image.open(fn).convert('RGB')
    bg = (0, 0, 0)
    print(f'== {fn} {im.size}')
    for i, gx in enumerate(SLOTS):
        rows = read2x(im, gx)
        print(f'  slot {i} gx={gx}:')
        for r in rows:
            print('    ' + ''.join('#' if c != bg else '.' for c in r))
    print()

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        main(fn)