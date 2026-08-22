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

def glyph(px, c, off):
    w = WIDTH[c]
    x0 = 2 * c + off
    g = []
    for r in range(11):
        row = []
        for i in range(w):
            on = 0
            for a in range(2):
                for b in range(2):
                    if is_green(px, x0 + 2 * i + a, 328 + 2 * r + b):
                        on = 1
            row.append(on)
        g.append(row)
    return g

def gstr(g):
    return '\n'.join(''.join('#' if v else '.' for v in row) for row in g)

def main():
    shots = [('ref', REF, 1)]
    for fn in sorted(os.listdir(D)):
        m = re.fullmatch(r'pa_([0-9a-f]{3})\.png', fn)
        if m:
            shots.append((m.group(1), os.path.join(D, fn), 0))
    # cluster globally at phase (0,0)
    clusters = {}
    table = {}
    for name, path, off in shots:
        im = Image.open(path).convert('RGB')
        px = im.load()
        if im.size[1] < 352 or im.size[0] < 640:
            table[name] = None
            continue
        row = []
        for c in SLOTS:
            key = gstr(glyph(px, c, off))
            if key not in clusters:
                clusters[key] = {'id': len(clusters), 'glyph': key, 'places': []}
            clusters[key]['places'].append('%s/%s' % (name, NAMES[SLOTS.index(c)]))
            row.append(clusters[key]['id'])
        table[name] = row
    out = []
    out.append('shot ' + ' '.join('%3s' % n for n in NAMES))
    for name, row in table.items():
        if row is None:
            out.append('%s  (skipped)' % name)
        else:
            out.append('%-4s' % name + ' '.join('%3d' % v for v in row))
    out.append('')
    for key, cl in sorted(clusters.items(), key=lambda kv: kv[1]['id']):
        pla = cl['places']
        out.append('--- g%02d  (%d occurrences: %s)' % (cl['id'], len(pla), ','.join(pla)))
        out.append(cl['glyph'])
    with open('pa2k_final.txt', 'w') as f:
        f.write('\n'.join(out))
    print('\n'.join(out[:6]))
    print('... (see pa2k_final.txt)')

main()