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

ref = Image.open('3.png').convert('RGB')
templates = {}
labels = ['0','0','1','%',' ','/','6','9','0','S','1','/','8','3','2',':','9','5']
for i, gx in enumerate(SLOTS):
    t = tuple(tuple(r) for r in binarize(read_canonical(ref, gx)))
    templates.setdefault(labels[i], t)

def read_region(im, x0, y0, w, h):
    out = []
    for y in range(y0, y0+h):
        row = []
        for x in range(x0, x0+w):
            c = im.getpixel((x, y))
            row.append((c[0]+c[1]+c[2])//3 > 80)
        out.append(row)
    return out

def dist(a, b):
    return sum(1 for r1, r2 in zip(a, b) for x1, x2 in zip(r1, r2) if x1 != x2)

t1 = templates['1']
for fn in ['og_002.png', 'og_004.png', 'og_006.png']:
    im = Image.open(fn).convert('RGB')
    w, h = im.size
    best = []
    for y0 in range(140, h-12):
        for x0 in range(90, w-7):
            r = read_region(im, x0, y0, 6, 11)
            d = dist(r, t1)
            best.append((d, x0, y0))
    best.sort()
    print(fn, 'top matches for "1":')
    for d, x0, y0 in best[:8]:
        print(f'  d={d} x0={x0} y0={y0}')
