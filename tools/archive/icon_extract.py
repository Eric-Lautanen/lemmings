import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc
from PIL import Image

# extract capture well icon (digger) as a 1-bit mask: x145..160, y186..199 (screen)
img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB')
px = img.load()
W, H = 16, 13
mask = [[0] * W for _ in range(H)]
for y in range(H):
    for x in range(W):
        p = px[145 + x, 186 + y]
        # any non-background, non-texture pixel
        if p not in ((176, 176, 0), (0, 0, 0), (128, 128, 128), (240, 240, 96), (255, 255, 255)):
            mask[y][x] = 1
for row in mask:
    print(''.join('#' if v else '.' for v in row))

# also the climber icon (button 2: x33..48)
print()
mask2 = [[0] * 16 for _ in range(13)]
for y in range(13):
    for x in range(16):
        p = px[33 + x, 186 + y]
        if p not in ((176, 176, 0), (0, 0, 0), (128, 128, 128), (240, 240, 96), (255, 255, 255)):
            mask2[y][x] = 1
for row in mask2:
    print(''.join('#' if v else '.' for v in row))

# check sec6 size and search for digger-ish icon region in sec6 raw 4bpp
main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
pos = 0
secs = []
while pos < len(main):
    comp_size = int.from_bytes(main[pos + 6:pos + 10], 'big')
    secs.append(dc.decompress_section(main[pos:pos + comp_size]))
    pos += comp_size
print('sec sizes:', [len(s) for s in secs])
print('sec6 320*40*2 =', 320 * 40 * 2, '4bpp packed =', 320 * 40 // 2)