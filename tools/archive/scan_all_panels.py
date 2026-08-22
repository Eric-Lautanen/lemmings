import os
from PIL import Image

base = r'C:\Users\ericl\AppData\Local\Temp\opencode'
cands = [
    os.path.join(base, 'og', 'vgalemmi_001.png'),
    os.path.join(base, 'og', 'vgalemmi_002.png'),
    os.path.join(base, 'og', 'vgalemmi_003.png'),
    os.path.join(base, 'og', 'vgalemmi_004.png'),
    os.path.join(base, 'og', 'vgalemmi_006.png'),
    os.path.join(base, 'lemmings-work', 'screens', 'dos_letsgo.png'),
    os.path.join(base, 'lemmings-work', 'screens', 'dos_floater.png'),
    os.path.join(base, 'lemmings-work', 'screens', 'LEMMING-screenshot_00.png'),
    os.path.join(base, 'lemmings-work', 'screens', 'LEMMING-screenshot_01.png'),
]
for f in cands:
    if not os.path.exists(f):
        continue
    im = Image.open(f).convert('RGB')
    print('=== %s (%dx%d) ===' % (os.path.basename(f), im.width, im.height))
    print('  full strip region x0..319 y160..199:')
    for y in range(160, 200):
        row = ''
        for x in range(0, 320):
            r, g, b = im.getpixel((x, y))
            if g > 120 and r < 100 and b < 100: row += 'G'
            elif r > 200 and g > 190 and b > 190: row += 'W'
            elif r > 130 and g > 130 and b < 100: row += 'Y'
            elif r > 180 and g > 170 and b > 170: row += 'o'
            else: row += '.'
        print('  y%d %s' % (y, row))
    print()