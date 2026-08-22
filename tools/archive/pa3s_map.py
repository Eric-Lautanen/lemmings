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

def read_region(im, x0, y0):
    out = []
    for y in range(y0, y0+11):
        row = []
        for x in range(x0, x0+6):
            c = im.getpixel((x, y))
            row.append((c[0]+c[1]+c[2])//3 > 80)
        out.append(row)
    return out

def dist(a, b):
    return sum(1 for r1, r2 in zip(a, b) for x1, x2 in zip(r1, r2) if x1 != x2)

im = Image.open('og_004.png').convert('RGB')
w, h = im.size
found = []
for y0 in range(150, 180):
    for x0 in range(60, w-6):
        r = read_region(im, x0, y0)
        best_l, best_d = None, 99
        for lab, t in templates.items():
            if lab == ' ':
                continue
            d = dist(r, t)
            if d < best_d:
                best_d, best_l = d, lab
        if best_d <= 1:
            found.append((best_l, best_d, x0, y0))

found.sort(key=lambda t: (t[3], t[2]))
for f in found:
    print(f'label={f[0]} d={f[1]} x0={f[2]} y0={f[3]}')
