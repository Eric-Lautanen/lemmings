import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = r'C:\github\Lemmings\original'
secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
s6 = secs[6]
panel = dc.unpack_planar(s6[0:], 4, 320, 40)

# strip band = panel rows 0..? screen rows 160..199. Render rows 0-39 as '#'/'.'
out = []
for y in range(40):
    row = ''
    for x in range(320):
        row += '#' if panel[y*320+x] else '.'
    out.append('row%02d ' % y + row)
open(r'C:\Users\ericl\AppData\Local\Temp\opencode\pa5_panelband.txt', 'w').write('\n'.join(out))
print('done')
