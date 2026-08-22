import glob, os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'
for f in sorted(glob.glob(os.path.join(d, 'pa_*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    px = im.load()
    name = os.path.basename(f)

    # green mask: digit green is strong G, weak R, weak B
    def isgreen(r, g, b):
        return g > 110 and g > r + 25 and g > b + 25

    rowcnt = []
    for y in range(h):
        n = sum(1 for x in range(w) if isgreen(*px[x, y]))
        rowcnt.append(n)

    # find strip band: rows with significant green
    band = [y for y in range(h) if rowcnt[y] > 5]
    print(name, w, 'x', h)
    if not band:
        print('   NO GREEN STRIP')
        continue
    y0, y1 = min(band), max(band)
    print('   strip rows y=%d..%d' % (y0, y1))

    # column occupancy within band
    col = []
    for x in range(w):
        n = sum(1 for y in range(y0, y1 + 1) if isgreen(*px[x, y]))
        col.append(n)

    # cluster consecutive occupied columns; split on gaps >= 3 empty cols
    clusters = []
    inrun = False
    for x in range(w):
        if col[x] > 0:
            if not inrun:
                clusters.append([x, x])
                inrun = True
            else:
                clusters[-1][1] = x
        else:
            if inrun and x - clusters[-1][1] >= 3:
                inrun = False
    if inrun:
        clusters = clusters

    # re-split clusters wider than 14px (may hold 2 glyphs) by inner gaps >=2
    final = []
    for (a, b) in clusters:
        seg = [a]
        for x in range(a + 1, b + 1):
            if col[x] == 0 and x - 1 >= seg[-1] and x - seg[-1] == 1:
                pass
        # manual split: break where col==0 gap>=2
        runs = []
        cur = []
        for x in range(a, b + 1):
            if col[x] > 0:
                cur.append(x)
            else:
                if cur and x - 1 - cur[-1] >= 2:
                    runs.append(cur)
                    cur = []
        if cur:
            runs.append(cur)
        for r in runs:
            if r:
                final.append((min(r), max(r)))
    # dedupe overlapping
    merged = []
    for (a, b) in final:
        if merged and a - merged[-1][1] <= 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))

    print('   glyph slots (img x):', merged)
    for (a, b) in merged:
        width = b - a + 1
        if width > 20:
            print('   slot %d..%d WIDTH %d: skipping blob' % (a, b, width))
            continue
        # render ASCII art using the union of rows
        art = []
        for y in range(y0, y1 + 1):
            line = ''.join('#' if isgreen(*px[x, y]) else '.' for x in range(a, b + 1))
            art.append(line)
        print('   slot x=%3d..%3d w=%2d' % (a, b, width))
        for line in art:
            print('     ' + line.rstrip())
    print()