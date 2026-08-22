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
s2 = secs[2]

R = {}
L = {}
for d in range(10):
    R[d] = s2[0x1900 + d * 16:0x1900 + d * 16 + 8]
    L[d] = s2[0x1908 + d * 16:0x1908 + d * 16 + 8]

# precompute expected 2-digit combos (left half L[tens], right half R[ones])
combos = {}
for tens in range(10):
    for ones in range(10):
        combos[(tens, ones)] = bytes((L[tens][i] & 0xF0) | (R[ones][i] & 0x0F) for i in range(8))


def best_match(cell):
    best = (0, None)
    for (t, o), exp in combos.items():
        score = sum(1 for i in range(8) for c in range(8)
                    if ((exp[i] >> (7 - c)) & 1) == ((cell[i] >> (7 - c)) & 1))
        if score > best[0]:
            best = (score, '{}{}'.format(t, o))
    return best


def cell_bits(img, x0, y0=177, h=8):
    px = img.load()
    bits = []
    for y in range(y0, y0 + h):
        row = 0
        for xx in range(8):
            p = px[x0 + xx, y]
            if p[0] > 150 and p[1] > 150 and p[2] > 150:
                row |= 1 << (7 - xx)
        bits.append(row)
    return bytes(bits)


for name in ['vgalemmi_002', 'vgalemmi_004', 'vgalemmi_006']:
    img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\{}.png'.format(name)).convert('RGB')
    print('==== {} ===='.format(name))
    for s in range(8):
        row = []
        for dx in range(-2, 3):
            cb = cell_bits(img, 4 + s * 16 + dx)
            score, m = best_match(cb)
            row.append('dx{}: {}({})'.format(dx, m, score))
        print('well {}: {}'.format(s, ' | '.join(row)))