import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = r'C:\github\Lemmings\original'
secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
s6 = secs[6]
chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
font = {}
for i, c in enumerate(chars):
    font[c] = dc.unpack_planar(s6[0x1900 + i*0x30:], 3, 8, 16)

from PIL import Image
im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png').convert('L')
px = im.load()

def dump(x0, y0, w=8, h=16):
    out = []
    for y in range(y0, y0+h):
        out.append(''.join('#' if px[x, y] > 128 else '.' for x in range(x0, x0+w)))
    return out

def dump_font(c):
    t = font[c]
    return [''.join('#' if t[y*8+x] else '.' for x in range(8)) for y in range(16)]

print('=== og_004 band rows 158-180, cols 110-145 ===')
for y in range(158, 181):
    print('%d %s' % (y, ''.join('#' if px[x, y] > 128 else '.' for x in range(110, 146))))

print()
print('=== sec6 O ===')
print('\n'.join(dump_font('O')))
print('=== sec6 U ===')
print('\n'.join(dump_font('U')))
print('=== sec6 T ===')
print('\n'.join(dump_font('T')))
