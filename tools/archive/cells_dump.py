import os
from PIL import Image

base = r'C:\Users\ericl\AppData\Local\Temp\opencode'
cands = [
    ('v004', os.path.join(base, 'og', 'vgalemmi_004.png')),
    ('v006', os.path.join(base, 'og', 'vgalemmi_006.png')),
    ('v002', os.path.join(base, 'og', 'vgalemmi_002.png')),
    ('letsgo', os.path.join(base, 'lemmings-work', 'screens', 'dos_letsgo.png')),
    ('floater', os.path.join(base, 'lemmings-work', 'screens', 'dos_floater.png')),
]
for name, f in cands:
    im = Image.open(f).convert('RGB')
    sx = im.width / 320.0
    sy = im.height / 200.0
    def px(x, y):
        r, g, b = im.getpixel((int(round(x * sx)), int(round(y * sy))))
        if g > 120 and r < 100 and b < 100: return 'G'
        if r > 200 and g > 190 and b > 190: return 'W'
        if r > 130 and g > 130 and b < 100: return 'Y'
        if r + g + b > 150: return 'o'
        return '.'
    print('=== %s ===' % name)
    for y in range(176, 200):
        a = ''.join(px(x, y) for x in range(132, 140))
        b = ''.join(px(x, y) for x in range(148, 156))
        print(' y%3d L[%s] R[%s]' % (y, a, b))
    print()