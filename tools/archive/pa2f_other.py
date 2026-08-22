import os, re
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def runs_band(path, y0, y1, x0, x1):
    im = Image.open(path).convert('RGB')
    px = im.load()
    w, h = im.size
    x1 = min(x1, w)
    union = set()
    for y in range(y0, min(y1, h)):
        for x in range(x0, x1):
            if is_green(px, x, y):
                union.add(x)
    xs = sorted(union)
    runs = []
    for x in xs:
        if runs and x == runs[-1][1] + 1:
            runs[-1][1] = x
        else:
            runs.append([x, x])
    return runs

def main():
    for fn in ['shot01.png', 'fun3_dos.png', 'fun3_wiki.png', 'lvl2_dos.png']:
        path = os.path.join(D, fn)
        im = Image.open(path).convert('RGB')
        w, h = im.size
        print('==', fn, 'size', w, 'x', h)
        # scan bottom 40% for green bands with runs
        y0 = int(h * 0.75)
        runs = runs_band(path, y0, h, 0, w)
        print('   bands (bottom 25%%):', ' '.join('%d-%d' % (a, b) for a, b in runs) or 'none')

main()