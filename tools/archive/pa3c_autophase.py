from PIL import Image
from collections import Counter
import glob, sys

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]
GW, GH = 6, 11

def gap_samples(im, y0, dx0, dy0):
    w, h = im.size
    samples = []
    for a, b in zip(SLOTS, SLOTS[1:]):
        if b - a < 9: continue
        for gx2 in (a+6, a+7):
            for yy in range(GH):
                px = 2*gx2 + dx0
                py = 2*(y0+yy) + dy0
                if px < w and py < h:
                    samples.append(im.getpixel((px, py)))
    return samples

def best_band(im):
    h = im.size[1]
    best = None
    for y0 in range(0, max(0, h - 2*GH + 1), 2):
        for dx0 in (0, 1):
            for dy0 in (0, 1):
                samples = gap_samples(im, y0, dx0, dy0)
                if not samples: continue
                bg = Counter(samples).most_common(1)[0][0]
                off = sum(1 for s in samples if s != bg)
                score = off / len(samples)
                cand = (score, y0, dx0, dy0, bg)
                if best is None or cand < best:
                    best = cand
    return best

def read_slot(im, gx, y0, dx0, dy0):
    w, h = im.size
    out = []
    for yy in range(GH):
        row = []
        for xx in range(GW):
            px = 2*gx + dx0 + xx
            py = 2*(y0+yy) + dy0
            row.append(im.getpixel((px, py)) if px < w and py < h else None)
        out.append(row)
    return out

def main(fn):
    im = Image.open(fn).convert('RGB')
    score, y0, dx0, dy0, bg = best_band(im)
    print(f'== {fn}: y0={y0} dx0={dx0} dy0={dy0} bg={bg} score={score:.3f} size={im.size}')
    for i, gx in enumerate(SLOTS):
        rows = read_slot(im, gx, y0, dx0, dy0)
        print(f'  slot {i} gx={gx}:')
        for row in rows:
            print('    ' + ''.join('#' if c is not None and c != bg else '.' for c in row))
    print()

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        main(fn)
