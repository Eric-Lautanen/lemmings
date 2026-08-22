import os, re
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'
REF = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'

SLOTS = [113, 121, 129, 145, 153, 186, 193, 209, 217, 225, 249, 258, 265, 273, 289, 297, 305, 313]
NAMES = ['A1','A2','A3','B1','B2','C1','C2','D1','D2','D3','E1','E2','E3','E4','F1','F2','F3','F4']
WIDTH = {c: (4 if c in (186, 258) else 6) for c in SLOTS}

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def glyph(px, c, off, dx, dy):
    w = WIDTH[c]
    x0 = 2 * c + off
    g = []
    for r in range(11):
        row = []
        for i in range(w):
            on = 0
            for a in range(2):
                for b in range(2):
                    if is_green(px, x0 + 2 * i + a + dx, 328 + 2 * r + b + dy):
                        on = 1
            row.append(on)
        g.append(row)
    return g

def gstr(g):
    return ''.join(''.join('#' if v else '.' for v in row) for row in g)

def hdist(a, b):
    sa = gstr(a)
    sb = gstr(b)
    return sum(1 for x, y in zip(sa, sb) if x != y)

def main():
    im = Image.open(REF).convert('RGB')
    px = im.load()
    # canonical from ref with dx=1, dy=0 (rows pair-identical: y pairs)
    # check dy: A1 rows: y0..y21: pairs differ (*) -> dy=? find best dy for ref vs its own 2 phases
    canon = {}
    for c in SLOTS:
        best = None
        for dx in (0, 1):
            for dy in (0, 1):
                g = glyph(px, c, 1, dx, dy)
                key = gstr(g)
                if best is None or key not in canon:
                    # collect all 4 variants for ref slot; keep first clean one?
                    pass
                canon.setdefault(c, {})
                canon[c][(dx, dy)] = key
    # ref self: the phase where row pairs are identical -> dy such that no '*' 
    # simplest: use dy=1 (second half of pairs) OR dy=0. Print both for A1/A3 to compare
    for c in (113, 129, 186, 297, 313):
        print('slot', c)
        for dy in (0, 1):
            for dx in (0, 1):
                g = glyph(px, c, 1, dx, dy)
                print('  dx%d dy%d:' % (dx, dy))
                print('\n'.join('   ' + ''.join('#' if v else '.' for v in row) for row in g))

main()