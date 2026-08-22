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


def match(cell):
    for tens in range(10):
        for ones in range(10):
            exp = bytes((L[tens][i] & 0xF0) | (R[ones][i] & 0x0F) for i in range(8))
            ok = all(((exp[i] >> (7 - c)) & 1) == ((cell[i] >> (7 - c)) & 1) for i in range(8) for c in range(8))
            if ok:
                return '{}{}'.format(tens, ones)
    return None


img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
px = img.load()
for s in range(8):
    x0 = 4 + s * 16
    bits = []
    for y in range(177, 185):
        row = 0
        for xx in range(8):
            p = px[x0 + xx, y]
            if p[0] > 150 and p[1] > 150 and p[2] > 150:
                row |= 1 << (7 - xx)
        bits.append(row)
    m = match(bytes(bits))
    print('well {} x{}: pattern={} -> match={}'.format(
        s, x0, ['%02X' % b for b in bits], m))

# rate cells
for lab, x0 in [('L', 132), ('R', 148)]:
    bits = []
    for y in range(177, 185):
        row = 0
        for xx in range(8):
            p = px[x0 + xx, y]
            if p[0] > 150 and p[1] > 150 and p[2] > 150:
                row |= 1 << (7 - xx)
        bits.append(row)
    m = match(bytes(bits))
    print('rate {} x{}: pattern={} -> match={}'.format(
        lab, x0, ['%02X' % b for b in bits], m))