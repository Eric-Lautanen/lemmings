import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
pos = 0
secs = []
while pos < len(main):
    comp_size = int.from_bytes(main[pos + 6:pos + 10], 'big')
    secs.append(dc.decompress_section(main[pos:pos + comp_size]))
    pos += comp_size
s6 = secs[6]
px = dc.unpack_planar(s6[0:], 4, 320, 40)

for btn in [0, 2, 3, 9]:
    x0 = btn * 16
    print('=== button %d (x%d..%d) ===' % (btn, x0, x0 + 15))
    for y in range(16, 39):
        row = ''
        for x in range(x0, x0 + 16):
            v = px[y * 320 + x]
            row += '0123456789abcdef'[v]
        print('  r%02d %s' % (y, row))