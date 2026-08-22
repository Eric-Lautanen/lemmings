import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc
from PIL import Image

# extract digger + climber icon masks from capture v002
img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB')
px = img.load()
BG = {(176, 176, 0), (0, 0, 0), (128, 128, 128), (240, 240, 96)}

def mask(x0, y0, w, h):
    m = []
    for y in range(h):
        row = 0
        for x in range(w):
            p = px[x0 + x, y0 + y]
            if p not in BG:
                row |= 1 << (w - 1 - x)
        m.append(row)
    return m

# digger well: x145..160, y186..199 (13 rows). icon = rows 28..36 x147..157
dig = mask(147, 186, 11, 13)
cli = mask(36, 186, 11, 13)
print('digger mask:')
for r in dig: print(''.join('#' if r >> (10 - i) & 1 else '.' for i in range(11)))
print('climber mask:')
for r in cli: print(''.join('#' if r >> (10 - i) & 1 else '.' for i in range(11)))

# now search main.dat sections for these patterns (any size match on downscale? just exact 11-wide first)
main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
pos = 0
secs = []
while pos < len(main):
    comp_size = int.from_bytes(main[pos + 6:pos + 10], 'big')
    secs.append(dc.decompress_section(main[pos:pos + comp_size]))
    pos += comp_size

# convert sec0 (anims, 3bpp planar) + sec3 (objects 4bpp?) to 1-bit masks per plane
def sec0_mask(sec, plane):
    # sec = list of (mask_rows) for each 8-px chunk? simpler: unpack whole sec as 1bpp row-major
    return None

# brute force: for each section, treat data as 1bpp rows of 8 px and search for the 11-wide pattern
def search(sec, pat, name):
    # build 1bpp bitstream: for each byte, bits MSB..LSB
    bits = []
    for b in sec:
        for sh in range(7, -1, -1):
            bits.append((b >> sh) & 1)
    W = 11
    for y0 in range(0, len(bits) // W - 12):
        ok = True
        for yy in range(13):
            row = 0
            for xx in range(W):
                row = (row << 1) | bits[(y0 + yy) * W + xx]
            if row != pat[yy]:
                ok = False
                break
        if ok:
            print('FOUND %s at row %d (byte %d)' % (name, y0, y0 * W // 8))
            return y0
    return None

for si, s in enumerate(secs):
    if len(s) > 2000:
        search(s, dig, 'digger in sec%d (11-wide rows)' % si)
        search(s, cli, 'climber in sec%d (11-wide rows)' % si)