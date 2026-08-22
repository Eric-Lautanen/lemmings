import os, re
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'
REF = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'

SLOTS = [113, 121, 129, 145, 153, 186, 193, 209, 217, 225, 249, 258, 265, 273, 289, 297, 305, 313]
WIDTH = {c: (4 if c in (186, 258) else 6) for c in SLOTS}

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def main():
    shots = [('ref', REF, 1), ('018', os.path.join(D, 'pa_018.png'), 0),
             ('042', os.path.join(D, 'pa_042.png'), 0), ('6c9', os.path.join(D, 'pa_6c9.png'), 0),
             ('d30', os.path.join(D, 'pa_d30.png'), 0), ('e91', os.path.join(D, 'pa_e91.png'), 0)]
    out = []
    for name, path, off in shots:
        im = Image.open(path).convert('RGB')
        px = im.load()
        out.append('#' * 70)
        out.append('==== %s' % name)
        for c in SLOTS:
            w = WIDTH[c]
            x0 = 2 * c + off
            art = []
            for k in range(22):
                row = ''.join('#' if is_green(px, x0 + i, 328 + k) else '.' for i in range(2 * w))
                # pair up -> 1 char per 2 px
                row = ''.join('#' if '#' in row[i:i + 2] else '.' for i in range(0, len(row), 2))
                art.append(row)
            out.append('---gx%d (box %d..%d)' % (c, x0, x0 + 2 * w - 1))
            out.extend(art)
    with open('pa2c_slotart.txt', 'w') as f:
        f.write('\n'.join(out))
    print('done')

main()