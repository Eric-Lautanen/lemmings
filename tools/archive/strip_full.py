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
chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
glyphs = []
for i, c in enumerate(chars):
    px = dc.unpack_planar(s6[0x1900 + i * 0x30:], 3, 8, 16)
    g = []
    for yy in range(16):
        row = 0
        for xx in range(8):
            v = px[yy * 8 + xx]
            if v == 2 or v == 3:
                row |= 1 << (7 - xx)
        g.append(row)
    glyphs.append((c, g))


def read_char(img, x, y=160):
    px = img.load()
    g = []
    for yy in range(y, y + 16):
        row = 0
        for xx in range(8):
            p = px[x + xx, yy]
            if p[0] > 150 and p[1] > 150 and p[2] > 150 or (p[1] > 100 and p[0] < 80 and p[2] < 80):
                row |= 1 << (7 - xx)
        g.append(row)
    best = (0, '?')
    for c, exp in glyphs:
        sc = sum(1 for a, b in zip(g, exp) if (a > 0) == (b > 0))
        if sc > best[0]:
            best = (sc, c)
    return best[1] if best[0] >= 200 else '?'


for name in ['vgalemmi_002', 'vgalemmi_004', 'vgalemmi_006']:
    img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\{}.png'.format(name)).convert('RGB')
    # strip spans x0..320? find text rows
    text = []
    for x in range(0, 320, 8):
        text.append(read_char(img, x))
    s = ''.join(text)
    print('==== {} ===='.format(name))
    print('  ', s[:40])
    print('  ', s[40:80])
    print('  ', s[80:120])
    print('  ', s[120:160])
    print('  ', s[160:200])
    print('  ', s[200:240])
    print('  ', s[240:280])
    print('  ', s[280:320])