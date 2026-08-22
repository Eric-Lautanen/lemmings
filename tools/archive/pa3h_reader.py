from PIL import Image
from collections import Counter
import sys

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]
GW, GH = 6, 11

def strip_band(im):
    # find y0 in original coords: 11-row band where slot windows contain content
    # but the gap columns between slots are pure bg
    w, h = im.size
    best = None
    for y0 in range(300, 356, 1):
        for dx0 in (0, 1):
            for dy0 in (0, 1):
                # bg = most common color in gap columns (always bg)
                px = []
                for a, b in zip(SLOTS, SLOTS[1:]):
                    if b - a < 9: continue
                    for gx2 in (a+6, a+7):
                        for yy in range(0, 11):
                            px2 = 2*gx2 + dx0
                            py = 2*(y0+yy) + dy0
                            if px2 < w and py < h:
                                px.append(im.getpixel((px2, py)))
                if not px: continue
                bg = Counter(px).most_common(1)[0][0]
                # gap score
                off = tot = 0
                for a, b in zip(SLOTS, SLOTS[1:]):
                    if b - a < 9: continue
                    for gx2 in (a+6, a+7):
                        for yy in range(0, 11):
                            px2 = 2*gx2 + dx0
                            py = 2*(y0+yy) + dy0
                            if py < h:
                                tot += 1
                                if im.getpixel((px2, py)) != bg:
                                    off += 1
                gapscore = off / max(1, tot)
                # content inside slot windows
                cont = totc = 0
                for gx in SLOTS:
                    for xx in range(0, 6, 2):
                        for yy in range(0, 11, 2):
                            px2 = 2*gx + dx0 + xx
                            py = 2*(y0+yy) + dy0
                            if px2 < w and py < h:
                                totc += 1
                                if im.getpixel((px2, py)) != bg:
                                    cont += 1
                contf = cont / max(1, totc)
                cand = (gapscore, -contf, y0, dx0, dy0, bg)
                if best is None or cand[:2] < best[:2]:
                    best = cand
    return best

def read_slot(im, gx, y0, dx0, dy0, bg):
    w, h = im.size
    out = []
    for yy in range(GH):
        row = []
        for xx in range(GW):
            px = 2*gx + dx0 + xx
            py = 2*(y0+yy) + dy0
            c = im.getpixel((px, py)) if px < w and py < h else None
            row.append(c)
        out.append(row)
    return out

def art(rows, bg):
    return '\n'.join(''.join('#' if c is not None and c != bg else '.' for c in r) for r in rows)

def main(fn):
    im = Image.open(fn).convert('RGB')
    gap, negcont, y0, dx0, dy0, bg = strip_band(im)
    print(f'== {fn} {im.size}: y0={y0} dx0={dx0} dy0={dy0} bg={bg} gapscore={gap:.3f} cont={-negcont:.2f}')
    for i, gx in enumerate(SLOTS):
        rows = read_slot(im, gx, y0, dx0, dy0, bg)
        print(f'  slot {i} gx={gx}:')
        for r in rows:
            print('    ' + ''.join('#' if c is not None and c != bg else '.' for c in r))
    print()

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        main(fn)