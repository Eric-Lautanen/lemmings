import os
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def find_strip(path, yfrom, yto):
    im = Image.open(path).convert('RGB')
    px = im.load()
    w, h = im.size
    # find rows with most green pixels
    best = []
    for y in range(yfrom, min(yto, h)):
        cnt = sum(1 for x in range(0, w) if is_green(px, x, y))
        best.append((cnt, y))
    best.sort(reverse=True)
    return best[:6], w, h

def main():
    for fn in ['fun3_dos.png', 'lvl2_dos.png', 'fun3_wiki.png', 'shot01.png', 'fun3a_f000.png', 'fun3b_f000.png']:
        path = os.path.join(D, fn)
        if not os.path.exists(path):
            print(fn, 'MISSING')
            continue
        im = Image.open(path).convert('RGB')
        w, h = im.size
        print('==', fn, w, 'x', h)
        tops, w, h = find_strip(path, 0, h)
        print('   top green rows:', tops)
        # scan full height for the densest green band
        dens = []
        for y in range(0, h):
            cnt = sum(1 for x in range(0, w) if is_green(im.load(), x, y))
            dens.append(cnt)
        # report bands of consecutive dense rows
        band = []
        cur = 0
        for y in range(h):
            if dens[y] > 8:
                cur += 1
            else:
                if cur >= 6:
                    band.append((y - cur, y - 1, max(dens[y - cur:y])))
                cur = 0
        if cur >= 6:
            band.append((h - cur, h - 1, max(dens[h - cur:])))
        print('   dense green bands (y0,y1,peak):', band[:8])

main()