import os
from PIL import Image

base = r'C:\Users\ericl\AppData\Local\Temp\opencode'
cands = [
    ('vgalemmi_001', os.path.join(base, 'og', 'vgalemmi_001.png')),
    ('vgalemmi_002', os.path.join(base, 'og', 'vgalemmi_002.png')),
    ('vgalemmi_003', os.path.join(base, 'og', 'vgalemmi_003.png')),
    ('vgalemmi_004', os.path.join(base, 'og', 'vgalemmi_004.png')),
    ('vgalemmi_006', os.path.join(base, 'og', 'vgalemmi_006.png')),
    ('dos_letsgo', os.path.join(base, 'lemmings-work', 'screens', 'dos_letsgo.png')),
    ('dos_floater', os.path.join(base, 'lemmings-work', 'screens', 'dos_floater.png')),
    ('shot_00', os.path.join(base, 'lemmings-work', 'screens', 'LEMMING-screenshot_00.png')),
    ('shot_01', os.path.join(base, 'lemmings-work', 'screens', 'LEMMING-screenshot_01.png')),
]
for name, f in cands:
    if not os.path.exists(f):
        print('MISSING', name)
        continue
    im = Image.open(f).convert('RGB')
    sx = im.width / 320.0
    sy = im.height / 200.0
    def X(v): return int(round(v * sx))
    def Y(v): return int(round(v * sy))
    x0, x1, y0, y1 = X(128), X(210), Y(175), min(Y(200), im.height)
    print('=== %s (%dx%d) rate region ===' % (name, im.width, im.height))
    prev = None
    for y in range(y0, y1):
        row = ''
        for x in range(x0, x1):
            r, g, b = im.getpixel((x, y))
            if g > 120 and r < 100 and b < 100: row += 'G'
            elif r > 200 and g > 190 and b > 190: row += 'W'
            elif r > 130 and g > 130 and b < 100: row += 'Y'
            elif r + g + b > 200: row += 'o'
            else: row += '.'
        print('  %4d %s' % (int(round(y / sy)) + 160, row))
    print()