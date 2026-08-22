import re, base64, json
from PIL import Image

# ---- load sec6 font from assets.js (per-glyph base64 object) ----
src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()
i = src.find('"font": {')
j = src.find('}', i)
print('slice:', repr(src[i:i + 30]))
fontobj = json.loads(src[i + len('"font":'):j + 1])
print('font keys:', list(fontobj.keys()))

def glyph(ch):
    raw = base64.b64decode(fontobj[ch])
    px = [[0] * 8 for _ in range(16)]
    for plane in range(3):
        for row in range(16):
            b = raw[plane * 16 + row]
            for col in range(8):
                if b & (1 << (7 - col)):
                    px[row][col] |= (1 << (2 - plane))
    return px

digits = {d: glyph(str(d)) for d in range(10)}

# ---- extract candidate rate cells from captures ----
def cell_mask(path, x0, y0=186, w=8, h=13):
    im = Image.open(path).convert('RGB')
    out = []
    for y in range(y0, y0+h):
        row = []
        for x in range(x0, x0+w):
            r, g, b = im.getpixel((x, y))
            row.append(1 if (g > 100 and r < 80 and b < 80) else 0)
        out.append(row)
    return out

def match(path, label, x0):
    mask = cell_mask(path, x0)
    best = None
    for d in range(10):
        score = 0
        for y in range(16):
            for x in range(8):
                gv = digits[d]
                score += abs(gv[y][x] - (mask[y][x] if y < len(mask) else 0))
        if best is None or score < best[1]:
            best = (d, score)
    print(f'{label}: best digit={best[0]} (score {best[1]})')

def glyph2(d):
    return digits[d]

def scan(path, label):
    """find the best digit + position anywhere in x125..170, y182..190"""
    im = Image.open(path).convert('RGB')
    best = None
    for y0 in range(182, 185):
        for x0 in range(125, 171):
            for d in range(10):
                score = 0
                gv = digits[d]
                for y in range(16):
                    for x in range(8):
                        px = im.getpixel((x0 + x, y0 + y))
                        isg = 1 if (px[1] > 100 and px[0] < 80 and px[2] < 80) else 0
                        score += abs(gv[y][x] - isg)
                if best is None or score < best[0]:
                    best = (score, x0, y0, d)
    print(f'{label}: best match score={best[0]} x={best[1]} y0={best[2]} digit={best[3]}')

for path, tag in [(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png', 'v004'),
                  (r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png', 'og004'),
                  (r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_006.png', 'v006')]:
    scan(path, tag)

# print digit 2 and 8 and 0 glyphs for reference
for d in [0, 2, 8]:
    print('digit', d)
    for row in digits[d]:
        print(''.join('#' if v else '.' for v in row))