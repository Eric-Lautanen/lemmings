import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = r'C:\github\Lemmings\original'
secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
s6 = secs[6]

chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
font = {}
for i, c in enumerate(chars):
    off = 0x1900 + i * 0x30
    font[c] = dc.unpack_planar(s6[off:], 3, 8, 16)

from PIL import Image
im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png').convert('L')
print('og_004', im.size)
px = im.load()
strip = {}
for y in range(140, 200):
    strip[y] = [1 if px[x, y] > 128 else 0 for x in range(320)]

def match(c, x0, y0):
    t = font[c]
    hit = 0; tot = 0
    for yy in range(16):
        for xx in range(8):
            tv = 1 if t[yy*8+xx] else 0
            v = strip[y0+yy][x0+xx]
            tot += 1
            if tv == v: hit += 1
    return hit, tot

# full sweep: best (char, x, y) matches in the band area
out = []
found = []
for y0 in range(140, 200 - 16):
    for x0 in range(0, 320 - 8, 2):
        for c in chars:
            hit, tot = match(c, x0, y0)
            if hit == tot:
                found.append((c, x0, y0))
print('perfect matches:', len(found))
for c, x0, y0 in sorted(found, key=lambda f: (f[1], f[2])):
    print('%r @ x=%d y=%d' % (c, x0, y0))
    out.append('%r x=%d y=%d' % (c, x0, y0))
open(r'C:\Users\ericl\AppData\Local\Temp\opencode\pa5_corr2.txt', 'w').write('\n'.join(out))
