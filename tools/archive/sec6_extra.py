import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc
from PIL import Image

main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
pos = 0
secs = []
while pos < len(main):
    comp_size = int.from_bytes(main[pos + 6:pos + 10], 'big')
    secs.append(dc.decompress_section(main[pos:pos + comp_size]))
    pos += comp_size
s6 = secs[6]
extra = s6[6400:]
print('extra len:', len(extra))
PAL = [(0,0,0),(64,64,224),(0,176,0),(240,208,208),(176,176,0),(240,32,32),(128,128,128),(240,240,96)]

# try to render as 4bpp with various widths; find a width where icons look structured
import math
for w in [16, 24, 32, 64, 128, 160, 182, 320, 456, 912, 1824]:
    if w == 0:
        continue
    h = len(extra) * 2 // w
    if h < 4 or h > 200:
        continue
    img = Image.new('RGB', (w, h))
    for i in range(len(extra)):
        b = extra[i]
        x = (i * 2) % w
        y = (i * 2) // w
        img.putpixel((x, y), PAL[b >> 4])
        if x + 1 < w:
            img.putpixel((x + 1, y), PAL[b & 15])
    # save as text-art downsampled: print a few sample rows
    nz = sum(1 for i in range(len(extra)) if extra[i] != 0)
    print('w=%d h=%d nonzero-bytes=%d/%d' % (w, h, nz, len(extra)))