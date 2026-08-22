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
px = dc.unpack_planar(s6[0:], 4, 320, 40)
PAL = [(0,0,0),(64,64,224),(0,176,0),(240,208,208),(176,176,0),(240,32,32),(128,128,128),(240,240,96),(255,255,255)]

cap = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB')
cap2 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png').convert('RGB')

for y in range(26, 39):
    diff = []
    for x in range(0, 320):
        c = cap.getpixel((x, 160 + y))
        if c == (0, 0, 0):
            continue
        a = PAL[px[y * 320 + x]] if px[y * 320 + x] < len(PAL) else (255, 255, 255)
        if a == c:
            continue
        diff.append((x, px[y * 320 + x], a, c))
    print('row', y, 'diff count:', len(diff))
    if diff:
        print('   first 8:', diff[:8])