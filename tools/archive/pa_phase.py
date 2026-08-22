import os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def isgreen(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def grid_phase(px, gx, y0, dx, dy):
    """Extract 6x11 grid with pixel phase (dx,dy) in 0..1."""
    x0 = 2 * gx + dx
    yb = y0 + dy
    rows = []
    for gy in range(11):
        line = ''
        for gxd in range(6):
            # glyph row has 2 px height & 2 px width at 2x; sample majority
            on = sum(1 for xx in range(x0 + 2 * gxd, x0 + 2 * gxd + 2)
                     for yy in range(yb + 2 * gy, yb + 2 * gy + 2)
                     if isgreen(px, xx, yy))
            line += '#' if on >= 1 else ''
            line += '.' if on < 1 else ''
        rows.append(line)
    return rows

def best_phase(px, gx, y0):
    best = None
    for dx in (0, 1):
        for dy in (0, 1):
            g = grid_phase(px, gx, y0, dx, dy)
            ink = sum(r.count('#') for r in g)
            # pair consistency: rows 2k vs 2k+1 should be identical
            cons = sum(1 for k in range(5) if g[2 * k] == g[2 * k + 1])
            score = (ink, cons)
            if best is None or score > best[1]:
                best = (g, score)
    return best[0]

shots = ['ref'] + ['018','042','046','229','2f1','330','6ad','6c9','6d6','7ea','80a','8dc','99b','b2e','c2e','c6b','d30','dc9','e61','e68','e91','ff5']
positions = {
    'A': [113,121,129], 'B': [137,145,153], 'C': [186,193],
    'D': [209,217,225], 'E': [249,258,265,273], 'F': [289,297,305,313],
}

# collect unique grids per shot, still print which slots vary
allg = {}
for sname in shots:
    path = (r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png' if sname == 'ref'
            else os.path.join(d, 'pa_%s.png' % sname))
    im = Image.open(path).convert('RGB')
    px = im.load()
    print(sname)
    for label, xs in positions.items():
        row = []
        for gx in xs:
            g = best_phase(px, gx, 328)
            if not any('#' in r for r in g):
                row.append(' ')
                continue
            key = tuple(g)
            if key not in allg:
                allg[key] = 'g%02d' % len(allg)
            row.append(allg[key])
        print('   %s: %s' % (label, ' '.join('%-4s' % r for r in row)))
    print()

# print all unique grids art
print('### UNIQUE GLYPHS (phase-corrected)')
for key, name in sorted(allg.items(), key=lambda kv: kv[1]):
    print('--- %s' % name)
    for r in key:
        print('   ' + r)