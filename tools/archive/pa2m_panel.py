import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
from PIL import Image
import datcommon as dc

secs = dc.decompress_dat(os.path.join(dc.ORIG, 'main.dat'))
data = secs[6]
print('len', len(data))

# try interpretations: 320x40 1bpp? 320x50 2bpp?
# DOS Lemmings panel is 320 wide. 8224 = 40*320/8 + spill? 40*320/8 = 1600. no.
# 2bpp planar 320x50 = 2*50*320/8 = 4000. no. 4 planes? 320x50 16color = 8000. close!
# 8224 ~ 8000 + 224. Maybe 320x50 16-color planar = 4 planes * 320/8 * 50 = 8000.
# try: 320x50, 4 planes.
w, h = 320, 50
plane = w * h // 8
print('plane', plane)

data = data[:8000]
# planar: for each row: plane0, plane1, plane2, plane3 (each w/8 bytes)
plane_size = w // 8
im = Image.new('RGB', (w, h))
px = im.load()
for y in range(h):
    row = data[y * plane_size * 4:(y + 1) * plane_size * 4]
    for bit in range(w):
        c = 0
        for p in range(4):
            byte = row[p * plane_size + bit // 8]
            if byte >> (7 - (bit % 8)) & 1:
                c |= 1 << p
        col = [(0, 0, 0), (0, 0, 0), (0, 255, 0), (0, 0, 0),
               (0, 0, 0), (0, 0, 0), (0, 0, 0), (128, 128, 128),
               (0, 0, 0), (0, 0, 0), (160, 160, 160), (0, 0, 0),
               (0, 0, 0), (0, 0, 0), (0, 0, 0), (255, 255, 255)][c]
        if c:
            px[bit, y] = col
out = r'C:\Users\ericl\AppData\Local\Temp\opencode\panel_s6.png'
im = im.resize((w * 2, h * 2), Image.NEAREST)
im.save(out)
print('saved', out)