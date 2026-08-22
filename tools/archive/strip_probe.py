import base64, json
from PIL import Image

src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()
i = src.find('"font": {')
j = src.find('}', i)
fontobj = json.loads(src[i + len('"font":'):j + 1])

def glyph(ch):
    raw = base64.b64decode(fontobj[ch])
    px = [[0] * 8 for _ in range(16)]
    for plane in range(3):
        for row in range(16):
            b = raw[plane * 16 + row]
            for col in range(8):
                if b & (1 << (7 - col)):
                    px[row][col] |= (1 << (2 - plane))
    return [[1 if v else 0 for v in r] for r in px]

G = {c: glyph(c) for c in fontobj}
im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')

def match_at(im, x0, y0=160):
    best = (' ', 999)
    for c, g in G.items():
        s = 0
        for y in range(16):
            for x in range(8):
                p = im.getpixel((x0 + x, y0 + y))
                isg = 1 if (p[1] > 100 and p[0] < 80 and p[2] < 80) else 0
                s += abs(g[y][x] - isg)
        if s < best[1]:
            best = (c, s)
    sc = sum(1 for y in range(16) for x in range(8)
             if (lambda p: p[1] > 100 and p[0] < 80 and p[2] < 80)(im.getpixel((x0 + x, y0 + y))))
    if sc < best[1]:
        best = (' ', sc)
    return best

for x0 in [0, 8, 16, 24, 32, 40, 112, 120, 128, 144, 186, 192, 216, 224, 248, 258, 264, 272, 288, 298, 304, 312]:
    print(x0, match_at(im, x0))