from PIL import Image
from collections import Counter

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]

def find_phase(im, scale, y0fixed, flip):
    w, h = im.size
    best = None
    for dy0 in range(scale):
        for dx0 in range(scale):
            pts = []
            for a, b in zip(SLOTS, SLOTS[1:]):
                if b - a >= 9:
                    g = a + 6
                    for r in range(11):
                        x = scale*g + dx0
                        y0 = y0fixed + dy0 + scale*r
                        if flip: y0 = h - 1 - y0
                        if 0 <= y0 < h:
                            pts.append(im.getpixel((x, y0)))
            if not pts: continue
            bg = Counter(pts).most_common(1)[0][0]
            off = sum(1 for p in pts if p != bg)
            cand = (off/len(pts), dx0, dy0, bg)
            if best is None or cand[0] < best[0]:
                best = cand
    return best

def dump(fn, scale, y0, dx0, dy0, bg, flip):
    im = Image.open(fn).convert('RGB')
    h = im.size[1]
    print(f'== {fn}: scale={scale} y0={y0} dx0={dx0} dy0={dy0} bg={bg} flip={flip}')
    for i, gx in enumerate(SLOTS):
        rows = []
        for yy in range(11):
            y = y0 + dy0 + scale*yy
            if flip: y = h - 1 - y
            row = ''.join('#' if im.getpixel((scale*gx+dx0+scale*xx, y)) != bg else '.' for xx in range(6))
            rows.append(row)
        print(f'  slot {i} gx={gx}:')
        for r in rows:
            print('    ' + r)
    print()

if __name__ == '__main__':
    for fn, scale, y0 in [('og_002.png',1,164), ('og_004.png',1,164), ('og_006.png',1,164),
                          ('og_000.png',2,328), ('og_001.png',2,328), ('og_003.png',2,328)]:
        im = Image.open(fn).convert('RGB')
        best = None
        for flip in (False, True):
            b = find_phase(im, scale, y0, flip)
            if b is None: continue
            if best is None or b[0] < best[0][0]:
                best = (b, flip)
        if best:
            b, flip = best
            dump(fn, scale, y0, b[1], b[2], b[3], flip)
        else:
            print(f'== {fn}: no strip found')