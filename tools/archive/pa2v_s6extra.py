import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

secs = dc.decompress_dat(os.path.join(dc.ORIG, 'main.dat'))
data = secs[6]
print('len', len(data))
extra = data[8000:]
print('extra len', len(extra))
# try: 14 bytes per glyph, 16 glyphs
for nbytes in [14, 16, 11, 22]:
    if 224 % nbytes == 0:
        print('== %d bytes x %d glyphs' % (nbytes, 224 // nbytes))
        for gi in range(0, 224, nbytes):
            g = extra[gi:gi + nbytes]
            print('%02d' % (gi // nbytes), g.hex(' '))
        print()