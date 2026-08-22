import os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def isgreen(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

# downsample glyph at gx to 6x11 grid: window x=2*gx..2*gx+11, y=y0..y0+21; each 2x2 block
def grid6x11(px, gx, y0=328):
    x0 = 2 * gx
    rows = []
    for gy in range(11):
        line = ''
        for gxd in range(6):
            on = (isgreen(px, x0 + 2 * gxd, y0 + 2 * gy) or
                  isgreen(px, x0 + 2 * gxd + 1, y0 + 2 * gy))
            line += '#' if on else '.'
        rows.append(line)
    return rows

shots = {
    '6c9': os.path.join(d, 'pa_6c9.png'),
    'd30': os.path.join(d, 'pa_d30.png'),
    'dc9': os.path.join(d, 'pa_dc9.png'),
    'ff5': os.path.join(d, 'pa_ff5.png'),
}
fields = {
    'A': [113,121,129], 'B': [145], 'C': [186,193],
    'D': [209,217,225], 'E': [249,258,265,273], 'F': [289,297,305,313],
}

# collect unique grids
seen = {}
order = []
tbl = []
for sname, path in shots.items():
    im = Image.open(path).convert('RGB')
    px = im.load()
    for label, xs in fields.items():
        for idx, gx in enumerate(xs):
            g = tuple(grid6x11(px, gx))
            if not any('#' in r for r in g):
                tbl.append((sname, label, idx, gx, None))
                continue
            if g not in seen:
                seen[g] = 'g%d' % len(order)
                order.append((seen[g], g))
            tbl.append((sname, label, idx, gx, seen[g]))

print('=== UNIQUE 6x11 GLYPHS ===')
for name, g in order:
    print('### %s' % name)
    for r in g:
        print('   ' + r)
    print()

print('=== READ TABLE ===')
for sname in shots:
    line = ['%-4s' % sname]
    for label, xs in fields.items():
        vals = [t[4] for t in tbl if t[0] == sname and t[1] == label]
        line.append('%s=[%s]' % (label, ' '.join(v if v else ' ' for v in vals)))
    print(' | '.join(line))