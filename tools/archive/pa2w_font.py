import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

secs = dc.decompress_dat(os.path.join(dc.ORIG, 'main.dat'))
data = secs[6]
extra = data[8000:]

def show(g, w=8):
    # g = 14 bytes, each bit is a pixel (MSB first?)
    for row in g:
        s = ''.join('#' if (row >> (7 - i)) & 1 else '.' for i in range(w))
        print(s.rstrip('.'))

for gi in range(16):
    print('--- glyph %d' % gi)
    show(extra[gi * 14:(gi + 1) * 14])