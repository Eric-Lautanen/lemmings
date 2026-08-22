import os, glob
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def col_union(px, gx, off):
    for gy in range(11):
        y = 328 + 2 * gy
        x = 2 * gx + off
        for dx in range(2):
            for dy in range(2):
                if is_green(px, x + dx, y + dy):
                    return True
    return False

def main():
    for name in sorted(os.path.basename(p)[3:-4] for p in glob.glob(os.path.join(D, 'pa_*.png'))):
        im = Image.open(os.path.join(D, 'pa_%s.png' % name)).convert('RGB')
        px = im.load()
        line = ''.join('#' if col_union(px, gx, 0) else '.' for gx in range(133, 166))
        line = line.rstrip('.')
        print('%-5s gx133..: %s' % (name, line))
    im = Image.open(r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png').convert('RGB')
    px = im.load()
    line = ''.join('#' if col_union(px, gx, 1) else '.' for gx in range(133, 166))
    print('ref   gx133..: %s' % line.rstrip('.'))

main()