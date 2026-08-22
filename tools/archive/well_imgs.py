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

PAL = [(0,0,0),(64,64,224),(0,176,0),(240,208,208),(176,176,0),(240,32,32),(128,128,128),(240,240,96)]
out = Image.new('RGB', (16*8, 13*4))
for b in [0, 2, 3, 9]:
    for y in range(26, 39):
        for x in range(16):
            v = px[y * 320 + b * 16 + x]
            out.putpixel((x + (b % 4) * 16, y - 26 + (b // 4) * 13), PAL[v])
out.save(r'C:\Users\ericl\AppData\Local\Temp\opencode\sec6_wells.png')

cap = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB')
out2 = Image.new('RGB', (16*8, 13*4))
for b in [0, 2, 3, 9]:
    for y in range(26, 39):
        for x in range(16):
            out2.putpixel((x + (b % 4) * 16, y - 26 + (b // 4) * 13), cap.getpixel((b * 16 + x, 160 + y)))
out2.save(r'C:\Users\ericl\AppData\Local\Temp\opencode\cap_wells.png')
print('saved')