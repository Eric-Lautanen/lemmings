import os
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def strip_art(name, off):
    path = os.path.join(D, 'pa_%s.png' % name)
    im = Image.open(path).convert('RGB')
    px = im.load()
    # accumulate per-gx column over rows 328..349 (11 row-pairs)
    cols = []
    for gx in range(100, 320):
        on = False
        for gy in range(11):
            y = 328 + 2 * gy
            x = 2 * gx + off
            for dx in range(2):
                for dy in range(2):
                    if is_green(px, x + dx, y + dy):
                        on = True
        cols.append(on)
    # convert to text: compress: print 11 rows of 1x art
    rows = []
    for gy in range(11):
        y = 328 + 2 * gy
        line = ''
        for gx in range(100, 320):
            x = 2 * gx + off
            on = False
            for dx in range(2):
                for dy in range(2):
                    if is_green(px, x + dx, y + dy):
                        on = True
            line += '#' if on else '.'
        rows.append(line)
    return rows

for name, off in [('018', 0), ('042', 0), ('8dc', 0), ('046', 0), ('229', 0)]:
    print('==', name)
    rows = strip_art(name, off)
    for r in rows:
        # trim and mark
        r = r.rstrip('.')
        print(r.replace('.', ' '))