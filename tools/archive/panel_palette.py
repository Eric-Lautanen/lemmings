import base64
from PIL import Image
from collections import Counter

src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()
i = src.find('"panel"')
j = src.find('"', i + 8)
k = src.find('"', j + 1)
panel = base64.b64decode(src[j + 1:k])
vals = []
for y in range(40):
    row = []
    for x in range(320):
        b = panel[(y * 320 + x) // 2]
        v = (b >> (4 * (1 - (x % 2)))) & 15
        row.append(v)
    vals.append(row)

im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')

# For each value v, collect capture colors at pixels (x, y) where vals[y][x] == v,
# but EXCLUDE the known dynamic regions: strip text rows 0..14 (y160..174), well digits rows 26..39,
# and the rate arrow/digit area (y186..195 x129..175). Use static rows for 0 and the frame rows.
def static_spots(v):
    cnt = Counter()
    for y in range(15, 40):
        for x in range(0, 320):
            if vals[y][x] != v:
                continue
            if y in (15,) and 112 <= x <= 319:  # strip text is rows 0..14, row15 is empty
                continue
            if x in range(125, 176) and y in range(176, 199):
                continue  # rate box area
            if y >= 25:  # wells area has digits; but border pixels are fine to sample
                pass
            cnt[im.getpixel((x, y))] += 1
    return cnt.most_common(3)

for v in range(0, 7):
    top = static_spots(v)
    print('value', v, '->', top)