import glob, os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'
for f in sorted(glob.glob(os.path.join(d, 'pa_*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    px = im.load()
    name = os.path.basename(f)

    def isgreen(r, g, b):
        return g > 110 and g > r + 25 and g > b + 25

    # scan only bottom 140 rows (panel zone)
    ymin = max(0, h - 140)
    rowcnt = [sum(1 for x in range(w) if isgreen(*px[x, y])) for y in range(ymin, h)]

    # find dense y-run (strip digits)
    best = None
    for y0 in range(len(rowcnt)):
        for y1 in range(y0 + 21, len(rowcnt)):
            tot = sum(rowcnt[y0:y1 + 1])
            if best is None or tot > best[0]:
                best = (tot, y0, y1)
    tot, y0, y1 = best
    gy0, gy1 = ymin + y0, ymin + y1
    print(name, w, 'x', h, '| strip band y=%d..%d (density=%d)' % (gy0, gy1, tot))

    # column occupancy within band
    col = [sum(1 for y in range(gy0, gy1 + 1) if isgreen(*px[x, y])) for x in range(w)]

    # cluster columns, split when gap >= 4 empty
    slotsov = []
    run = False
    for x in range(w):
        if col[x] > 0:
            if not run:
                slotsov.append([x, x])
                run = True
            else:
                slotsov[-1][1] = x
        elif x - 1 >= 0 and col[x] == 0 and run and (x - slotsov[-1][1]) >= 4:
            run = False
        elif col[x] == 0 and run:
            pass

    # per-slot tight y bounds
    for (a, b) in slotsov:
        if b - a > 21:
            continue
        ys = [y for y in range(gy0, gy1 + 1) if any(isgreen(*px[x, y]) for x in range(a, b + 1))]
        if not ys:
            continue
        ty0, ty1 = min(ys), max(ys)
        print('  slot img x=%3d..%3d w=%2d  y=%d..%d' % (a, b, b - a + 1, ty0, ty1))
        for y in range(ty0, ty1 + 1):
            print('    ' + ''.join('#' if isgreen(*px[x, y]) else '.' for x in range(a, b + 1)))
    print()