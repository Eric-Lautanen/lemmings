import os
from PIL import Image

base = r'C:\Users\ericl\AppData\Local\Temp\opencode'
og = os.path.join(base, 'og')

def cell_text(img, x0, y0):
    px = img.load()
    rows = []
    for y in range(y0, y0+8):
        r = ''
        for x in range(x0, x0+8):
            p = px[x, y]
            r += 'W' if (p[0] > 150 and p[1] > 150 and p[2] > 150) else ('.' if p[0] < 40 and p[1] < 40 and p[2] < 40 else '?')
        rows.append(r)
    return rows

def show(name, path):
    img = Image.open(path).convert('RGB')
    w, h = img.size
    print(f'== {name} size={w}x{h}')
    # panel rows 170..200, x 125..160 (rate region)
    for (x0, lab) in [(132, 'Lcell'), (148, 'Rcell')]:
        rows = cell_text(img, x0, 177)
        print(f'  {lab} x{x0}:')
        for i, r in enumerate(rows):
            print(f'    y{177+i}: {r}')

files = [
    ('vgalemmi_002', os.path.join(og, 'vgalemmi_002.png')),
    ('vgalemmi_004', os.path.join(og, 'vgalemmi_004.png')),
    ('vgalemmi_006', os.path.join(og, 'vgalemmi_006.png')),
    ('dos_letsgo', os.path.join(base, 'lemmings-work', 'screens', 'dos_letsgo.png')),
    ('dos_floater', os.path.join(base, 'lemmings-work', 'screens', 'dos_floater.png')),
]
for name, path in files:
    if os.path.exists(path):
        show(name, path)
    else:
        print(f'== {name} MISSING {path}')