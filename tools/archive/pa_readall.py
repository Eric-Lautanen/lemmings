import os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def isgreen(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

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
    return tuple(rows)

# build glyph catalog from previous analysis (6x11 grids of pa shots)
cat = {}
cat['0'] = ('.##...','#####.','##..#.','##..#.','##..##','##..##','#...#.','#...##','######','######','.####.')
cat['0b'] = ('#...#.','#...#.','##..#.','#...#.','##..##','##..#.','#...##','#...##','##.###','######','.####.')
cat['1'] = ('##.#..','#####.','######','..##..','..##..','..##..','..##..','..##..','..##..','..##..','..##..')
cat['%'] = ('.##...','#####.','##..##','##....','#.#...','#####.','##..#.','#...##','##.###','######','.####.')
cat['7'] = ('#.....','###...','.##...','.#....','.##...','.#....','.#....','.##...','##....','###...','####..')
cat['0c'] = ('##..#.','####.#','#####.','##..#.','##..#.','##..#.','#...#.','##..##','#...#.','#...##','##..##')
cat['6'] = ('.##...','#####.','##..#.','##..##','##..#.','##..##','##..##','#...##','#..###','######','.####.')
cat['3'] = ('#...#.','##..#.','...#.#','...##.','..###.','..##..','.###..','.##...','###...','##..#.','##..##')
cat['1b'] = ('#....#','##..##','######','######','##.#.#','##...#','##...#','#....#','##...#','#....#','#....#')
cat['9'] = ('##.#..','#####.','##....','##....','##....','####..','##....','##....','##.#..','#####.','######')
cat['5'] = ('...##.','...##.','..####','..####','.##.#.','.##.##','##..#.','#####.','###..#','.#####','....##')
cat[':'] = ('......','......','......','......','.##.#.','##...#','.####.','......','......','......','......')
cat['8'] = ('.##...','#####.','##..#.','##..##','.####.','######','##..##','#...#.','##.###','######','.####.')
cat['2'] = ('.#....','.##...','.##...','..##..','..#...','..#...','..##..','..#...','..##..','..##..','..##..')

# for matching, compare each row exactly; also allow 1px horizontal/vertical shift
def match(g, cat):
    best = None
    for name, t in cat.items():
        for dy in range(-1, 2):
            for dx in range(-2, 3):
                same = 0
                for r in range(11):
                    rr = r + dy
                    if rr < 0 or rr >= 11: continue
                    for c in range(6):
                        cc = c + dx
                        if cc < 0 or cc >= 6: continue
                        if g[r][c] == '#' and g[r][c] == t[rr][cc]:
                            same += 1
                # penalize template pixels not covered
                miss = sum(1 for r in range(11) for c in range(6)
                           if t[r][c] == '#' and (r - dy < 0 or r - dy >= 11 or c - dx < 0 or c - dx >= 6 or g[r - dy][c - dx] != '#'))
                score = same - 2 * miss
                if best is None or score > best[1]:
                    best = (name, score)
    return best

fields = {
    'A': [113,121,129], 'B': [145], 'C': [186,193],
    'D': [209,217,225], 'E': [249,258,265,273], 'F': [289,297,305,313],
}
shots = ['ref'] + [fn[3:-4] for fn in sorted(os.listdir(d)) if fn.startswith('pa_') and fn.endswith('.png')]
shots = [s for s in shots if s not in ('0e8', '1d6')]

print('%-5s | %-12s | %-12s | %-10s | %-12s | %-16s | %-20s' % ('shot', 'A(113,121,129)', 'B(145)', 'C(186,193)', 'D(209,217,225)', 'E(249..273)', 'F(289..313)'))
for sname in shots:
    if sname == 'ref':
        path = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'
    else:
        path = os.path.join(d, 'pa_%s.png' % sname)
    im = Image.open(path).convert('RGB')
    px = im.load()
    vals = {}
    for label, xs in fields.items():
        row = []
        for gx in xs:
            g = grid6x11(px, gx)
            if not any('#' in r for r in g):
                row.append(' ')
            else:
                m = match(g, cat)
                row.append(m[0] if m and m[1] > 0 else '?')
        vals[label] = row
    print('%-5s | %-12s | %-12s | %-10s | %-12s | %-16s | %-20s' % (
        sname,
        ' '.join(vals['A']),
        ' '.join(vals['B']),
        ' '.join(vals['C']),
        ' '.join(vals['D']),
        ' '.join(vals['E']),
        ' '.join(vals['F'])))