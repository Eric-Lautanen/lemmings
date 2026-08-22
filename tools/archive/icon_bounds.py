import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc
from PIL import Image

img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB')
px = img.load()
BG = {(176, 176, 0), (0, 0, 0), (128, 128, 128), (240, 240, 96)}

for name, x0, y0 in [('digger', 144, 186), ('climber', 32, 186), ('umbrella', 48, 186), ('slower', 0, 186)]:
    xs, xe, ys, ye = 999, -1, 999, -1
    pts = []
    for y in range(y0, y0 + 13):
        for x in range(x0, x0 + 16):
            if px[x, y] not in BG:
                xs = min(xs, x); xe = max(xe, x); ys = min(ys, y); ye = max(ye, y)
                pts.append((x, y))
    print(name, 'bounds x%d..%d y%d..%d (%dx%d)' % (xs, xe, ys, ye, xe - xs + 1, ye - ys + 1))

# exact mask of digger icon (x147..158, y188..197)
print()
for y in range(188, 198):
    row = ''
    for x in range(146, 159):
        p = px[x, y]
        row += '#' if p not in BG else '.'
    print('%3d %s' % (y, row))