import os, re
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def main():
    shots = ['ref', '018', '042', '046', '8dc', '99b', 'ff5', '6c9', 'e68']
    for name in shots:
        if name == 'ref':
            path = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'
            off = 1
        else:
            path = os.path.join(D, 'pa_%s.png' % name)
            off = 0
        im = Image.open(path).convert('RGB')
        px = im.load()
        print('==', name)
        # runs per row-pair for gx 130..165 (px ~260..335)
        x0, x1 = 260, 335
        for gy in range(11):
            y = 328 + 2 * gy
            line = ''
            for x in range(x0, x1, 2):
                on = (is_green(px, x, y) or is_green(px, x + 1, y) or
                      is_green(px, x, y + 1) or is_green(px, x + 1, y + 1))
                line += '#' if on else '.'
            # trim
            line = line.rstrip('.')
            if line:
                print('  gy%d gx130..: %s' % (gy, line))

main()