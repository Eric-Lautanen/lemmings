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
s0 = secs[0]
PAL = [(0,0,0),(64,64,224),(0,176,0),(240,208,208),(176,176,0),(240,32,32),(128,128,128),(240,240,96)]

def render(off, w, h, bpp, name):
    px = dc.unpack_planar(s0[off:], bpp, w, h)
    print('=== %s (off 0x%X, %dx%d, %dbpp) ===' % (name, off, w, h, bpp))
    for y in range(h):
        row = ''
        for x in range(w):
            v = px[y * w + x]
            row += '01234567'[v] if v < 8 else 'x'
        print(row)

# umbrella frame 3 (open umbrella): umbrella_r = 0x3AB0, 4 frames, 16x16, 3bpp = 96 B/frame
render(0x3AB0 + 3 * 96, 16, 16, 3, 'umbrella_r f3')
# preum frame 3
render(0x3930 + 3 * 96, 16, 16, 3, 'preum_r f3')
# dig frame 0
render(0x2D0, 16, 14, 3, 'dig f0')
# climb frame 1
render(0x810 + 1 * 96, 16, 12, 2, 'climb_r f1')