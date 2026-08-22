import glob, os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'
for f in sorted(glob.glob(os.path.join(d, 'pa_*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    px = im.load()
    name = os.path.basename(f)

    # panel zone: bottom 100 rows
    y0 = h - 100
    # any non-near-black pixel (panel is dark backdrop)
    def ison(r, g, b):
        return r + g + b > 90

    # column occupancy
    col = []
    for x in range(w):
        n = sum(1 for y in range(y0, h) if ison(*px[x, y]))
        col.append(n)

    runs = []
    cur = []
    for x in range(w):
        if col[x] > 0:
            cur.append(x)
        else:
            if cur and x - 1 - cur[-1] >= 5:
                runs.append(cur); cur = []
    if cur: runs.append(cur)

    print(name, w, 'x', h)
    for r in runs:
        a, b = r[0], r[-1]
        if b - a > 60:
            print('  blob x=%d..%d w=%d (skip)' % (a, b, b - a + 1))
            continue
        ys = [y for y in range(y0, h) if any(ison(*px[x, y]) for x in range(a, b + 1))]
        if not ys: continue
        ty0, ty1 = min(ys), max(ys)
        if ty1 - ty0 < 8:
            continue
        print('  cluster x=%3d..%3d w=%2d y=%d..%d h=%d' % (a, b, b - a + 1, ty0, ty1, ty1 - ty0 + 1))
        for y in range(ty0, ty1 + 1):
            line = ''
            for x in range(a, b + 1):
                r, g, b = px[x, y]
                line += '#' if ison(r, g, b) else '.'
            print('    ' + line)
    print()