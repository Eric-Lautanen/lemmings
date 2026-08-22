from PIL import Image
from collections import Counter
import sys

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]
GW, GH = 6, 11

def best_band(im):
    w, h = im.size
    best = None
    for y0 in range(0, max(2, h - 2*GH - 1), 2):
        for dx0 in (0, 1):
            for dy0 in (0, 1):
                # bg = most common color over 2-row-pair band across full width
                px = []
                for yy in range(0, 2*GH, 2):
                    py = 2*(y0+yy) + dy0
                    if 0 <= py < h:
                        for x in range(0, w, 2):
                            px.append(im.getpixel((x, py)))
                if not px: continue
                bg = Counter(px).most_common(1)[0][0]
                # gap columns between slots
                off = tot = 0
                for a, b in zip(SLOTS, SLOTS[1:]):
                    if b - a < 9: continue
                    for gx2 in (a+6, a+7):
                        for yy in range(GH):
                            px2 = 2*gx2 + dx0
                            py = 2*(y0+yy) + dy0
                            if 0 <= px2 < w and 0 <= py < h:
                                tot += 1
                                if im.getpixel((px2, py)) != bg:
                                    off += 1
                if tot == 0: continue
                score = off / tot
                # also require band has non-bg content (not pure bg region)
                cand = (score, y0, dx0, dy0, bg)
                if best is None or cand[:4] < best[:4]:
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
            row.append(im.getpixel((px, py)) if 0 <= px < w and 0 <= py < h else None)
        out.append(row)
    return out

def main(fn):
    im = Image.open(fn).convert('RGB')
    score, y0, dx0, dy0, bg = best_band(im)
    print(f'== {fn}: y0={y0} dx0={dx0} dy0={dy0} bg={bg} score={score:.3f} size={im.size}')
    for i, gx in enumerate(SLOTS):
        rows = read_slot(im, gx, y0, dx0, dy0, bg)
        print(f'  slot {i} gx={gx}:')
        for row in rows:
            print('    ' + ''.join('#' if c is not None and c != bg else '.' for c in row))
    print()

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        main(fn)