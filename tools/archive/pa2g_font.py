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
    width = 13  # slot name + art width 6 -> but w4 needs 4: print side by side with fixed width 9
    # side-by-side print, 2 slots per line? Instead: print all 18 stacked with names
    for c, nm in zip(SLOTS, NAMES):
        w = WIDTH[c]
        x0 = 2 * c + 1
        art = []
        for gy in range(11):
            y = 328 + 2 * gy
            row = ''.join('#' if is_green(px, x0 + i, y) else '.' for i in range(w))
            art.append(row)
        out.append('%s: %s' % (nm.ljust(4), ' '.join(art)))
    with open('pa2g_ref_font.txt', 'w') as f:
        f.write('\n'.join(out))
    for line in out:
        print(line)

main()