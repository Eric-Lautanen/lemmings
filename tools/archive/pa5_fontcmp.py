import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = r'C:\github\Lemmings\original'
secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
s6 = secs[6]
print('sec6 len', len(s6))

chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
out = []
for i, c in enumerate(chars):
    off = 0x1900 + i * 0x30
    px = dc.unpack_planar(s6[off:], 3, 8, 16)
    out.append('--- %r off=%04X' % (c, off))
    for y in range(16):
        out.append(''.join('#' if px[y*8+x] else '.' for x in range(8)))

# glyphs after Z (0x1900 + 38*0x30 = end of sec6?)
o2 = 0x1900 + 38 * 0x30
print('sec6 len', len(s6), ' font end', o2)

open(r'C:\Users\ericl\AppData\Local\Temp\opencode\pa5_fontdump.txt', 'w').write('\n'.join(out))
print('dumped', len(out), 'lines')