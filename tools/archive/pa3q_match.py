from PIL import Image

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]

def read_canonical(im, gx, xoff=1, y0=328, step=2):
    rows = []
    for yy in range(11):
        row = []
        for xx in range(6):
            row.append(im.getpixel((step*gx + xoff + step*xx, y0 + step*yy)))
        rows.append(row)
    return rows

def binarize(px):
    return [[c[0] > 100 for c in row] for row in px]

def match(art, gx, y0, dx, bg):
    im = art[0]; im2 = art[1]
    s = 0
    for slot in SLOTS:
        for yy in range(11):
            for xx in range(6):
                c = im.getpixel((slot + dx + xx, y0 + yy))
                on = (c[0] + c[1] + c[2]) // 3 > 80
                s += on
    return s

ref = Image.open('3.png').convert('RGB')
templates = {}
labels = ['0','0','1','%',' ','/','6','9','0','S','1','/','8','3','2',':','9','5']
for i, gx in enumerate(SLOTS):
    art = read_canonical(ref, gx)
    t = tuple(tuple(row) for row in binarize(art))
    templates.setdefault(labels[i], t)

def read_native(im, gx, y0, dx):
    rows = []
    for yy in range(11):
        row = []
        for xx in range(6):
            c = im.getpixel((gx + dx + xx, y0 + yy))
            row.append((c[0] + c[1] + c[2]) // 3 > 80)
        rows.append(row)
    return rows

def dist(a, b):
    return sum(1 for r1, r2 in zip(a, b) for x1, x2 in zip(r1, r2) if x1 != x2)

for fn in ['og_002.png', 'og_004.png', 'og_006.png']:
    im = Image.open(fn).convert('RGB')
    best = None
    for y0 in range(140, min(196, im.size[1] - 11)):
        for dx in (0, 1):
            score = 0
            for gx in SLOTS:
                art = read_native(im, gx, y0, dx)
                d = min(dist(art, t) for t in templates.values())
                score += d
            if best is None or score < best[0]:
                best = (score, y0, dx)
    score, y0, dx = best
    print(f'{fn}: best y0={y0} dx={dx} score={score}')
    for i, gx in enumerate(SLOTS):
        art = read_native(im, gx, y0, dx)
        bestl, bestd = None, 99
        for lab, t in templates.items():
            d = dist(art, t)
            if d < bestd:
                bestd, bestl = d, lab
        print(f'  s{i} gx={gx} -> {bestl} d={bestd}')
        for r in art:
            print('   ', ''.join('#' if v else '.' for v in r))
