import os, re
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'
REF = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'

SLOTS = [113, 121, 129, 145, 153, 186, 193, 209, 217, 225, 249, 258, 265, 273, 289, 297, 305, 313]
WIDTH = {c: (4 if c in (186, 258) else 6) for c in SLOTS}

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def downsample(px, x0, y0, w, dx, dy):
    g = []
    for r in range(11):
        row = []
        for i in range(w):
            c = 0
            for a in range(2):
                for b in range(2):
                    if is_green(px, x0 + 2 * i + a + dx, y0 + 2 * r + b + dy):
                        c = 1
            row.append(c)
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
    clusters = {}
    table = {}
    for name, path, off in shots:
        im = Image.open(path).convert('RGB')
        px = im.load()
        row = []
        for c in SLOTS:
            w = WIDTH[c]
            x0 = 2 * c + off
            g = downsample(px, x0, 328, w, 0, 0)
            key = gstr(g)
            if key not in clusters:
                clusters[key] = {'id': len(clusters), 'g': g, 'w': w, 'shots': []}
            clusters[key]['shots'].append(name)
            row.append(clusters[key]['id'])
        table[name] = row
    print('shot ' + ' '.join('%3d' % c for c in SLOTS))
    for name, row in table.items():
        print('%s  ' % name + ' '.join('%3d' % v for v in row))
    with open('pa2b_clusters.txt', 'w') as f:
        for key, cl in sorted(clusters.items(), key=lambda kv: kv[1]['id']):
            f.write('--- g%02d (w%d)\n%s\n' % (cl['id'], cl['w'], gstr(cl['g'])))
    print()
    print('unique clusters: %d' % len(clusters))

main()