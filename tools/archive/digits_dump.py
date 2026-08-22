import os
import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = dc.ORIG
secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
s1 = secs[1]
for i in range(10):
    off = 0x0134 + (9 - i) * 8
    px = dc.mask_to_bits(s1[off:], 8, 8)
    print('digit %d:' % i)
    for y in range(8):
        print('  ' + ''.join('#' if px[y * 8 + x] else '.' for x in range(8)))