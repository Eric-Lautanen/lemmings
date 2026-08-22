from PIL import Image
from collections import Counter, defaultdict
import sys

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]

def read2(im, gx, dy0):
    rows = []
    for yy in range(11):
        row = []
        for xx in range(6):
            px = 2*gx + 1 + 2*xx
            py = 2*yy + dy0 + 328
            c = im.getpixel((px, py))
            row.append(c)
        rows.append(row)
    return tuple(''.join('#' if c != (0,0,0) else '.' for c in r) for r in rows)

def best_dy0(im):
    best = None
    for dy0 in (0, 1):
        off = tot = 0
        # gap columns between slots (12px glyphs, gap = cols 2*(gx+6)+1 .. 2*(gx+7)+1)
        for a, b in zip(SLOTS, SLOTS[1:]):
            if b - a < 9: continue
            for gx2 in (a+6, a+7):
                for yy in range(11):
                    px = 2*gx2 + 1
                    py = 2*yy + dy0 + 328
                    if im.getpixel((px, py)) != (0,0,0):
                        off += 1
                    tot += 1
        score = off / max(1, tot)
        if best is None or score < best[0]:
            best = (score, dy0)
    return best

def main(fns):
    table = {}
    art = {}
    for fn in fns:
        im = Image.open(fn).convert('RGB')
        score, dy0 = best_dy0(im)
        table[fn] = [read2(im, gx, dy0) for gx in SLOTS]
        art[fn] = (dy0, score)
    # cluster: group each slot index by glyph identity across shots
    for i in range(18):
        groups = defaultdict(list)
        for fn in fns:
            groups[table[fn][i]].append(fn.split('.')[0])
        ids = {}
        for k, v in groups.items():
            ids[k] = ','.join(v)
        print(f'slot {i} gx={SLOTS[i]}:')
        for k in sorted(groups, key=lambda k: ','.join(groups[k])):
            print(f'  [{",".join(groups[k])}]')
            for r in k:
                print('    ' + r)
    print()
    for fn in fns:
        print(f'{fn}: dy0={art[fn][0]} gaps={art[fn][1]:.3f}')

if __name__ == '__main__':
    main(sys.argv[1:])