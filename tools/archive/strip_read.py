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

def match_at(im, x0, y0=160):
    """best glyph (or space) at x0, score = mismatched px"""
    best = (' ', 999)
    for c, g in G.items():
        s = 0
        for y in range(16):
            for x in range(8):
                px = im.getpixel((x0 + x, y0 + y))
                isg = 1 if (px[1] > 100 and px[0] < 80 and px[2] < 80) else 0
                s += abs(g[y][x] - isg)
        if s < best[1]:
            best = (c, s)
    # space score = count of green px in window
    s = sum(1 for y in range(16) for x in range(8) if (lambda p: p[1] > 100 and p[0] < 80 and p[2] < 80)(im.getpixel((x0 + x, y0 + y))))
    if s < best[1]:
        best = (' ', s)
    return best

import numpy as np
# sanity: match my decoded font against the WEB's own rendered strip (web_panel.raw)
web = np.fromfile(r'C:\Users\ericl\AppData\Local\Temp\opencode\web_panel.raw', dtype=np.uint8, sep=',').reshape(40, 320, 3)

def web_match(x0):
    best = (' ', 999)
    for c, g in G.items():
        s = 0
        for y in range(16):
            for x in range(8):
                p = web[y, x0 + x]
                isg = 1 if (p[1] > 100 and p[0] < 80 and p[2] < 80) else 0
                s += abs(g[y][x] - isg)
        if s < best[1]:
            best = (c, s)
    return best

wtxt = ''
for x0 in range(0, 320, 8):
    c, s = web_match(x0)
    wtxt += c if s < 20 else ('?')
print('WEB strip :', wtxt)

for path, tag in [(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png', 'v004'),
                  (r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png', 'og004'),
                  (r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_006.png', 'v006')]:
    im = Image.open(path).convert('RGB')
    text = ''
    for x0 in range(0, 320, 8):
        c, s = match_at(im, x0)
        text += c if s < 20 else ('?') 
    print(tag, ':', text)
    # also report the two digit windows of the rate box
    for name, x0 in [('rate1', 132), ('rate2', 148)]:
        c, s = match_at(im, x0)
        print('   ', name, 'x%d' % x0, '->', c, 'score', s)