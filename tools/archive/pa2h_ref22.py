import os
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'
REF = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'

SLOTS = [113, 121, 129, 145, 153, 186, 193, 209, 217, 225, 249, 258, 265, 273, 289, 297, 305, 313]
NAMES = ['A1','A2','A3','B1','B2','C1','C2','D1','D2','D3','E1','E2','E3','E4','F1','F2','F3','F4']
WIDTH = {c: (4 if c in (186, 258) else 6) for c in SLOTS}

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def main():
    im = Image.open(REF).convert('RGB')
    px = im.load()
    out = []
    for c, nm in zip(SLOTS, NAMES):
        w = WIDTH[c]
        x0 = 2 * c + 1
        for side in ('x', 'y'):
            break
        # full 22 rows, paired rows shown with index
        for gy in range(11):
            y = 328 + 2 * gy
            rowa = ''.join('#' if is_green(px, x0 + i, y) else '.' for i in range(w))
            rowb = ''.join('#' if is_green(px, x0 + i, y + 1) else '.' for i in range(w))
            mark = ' ' if rowa == rowb else '*'
            out.append('%s %d %s %s %s' % (nm, gy, mark, rowa, rowb))
        out.append('')
    with open('pa2h_ref22.txt', 'w') as f:
        f.write('\n'.join(out))
    print('\n'.join(out))

main()