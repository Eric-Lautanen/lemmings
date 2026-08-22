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

def is_dynamic(x, y):
    if y < 15:  # strip text rows 0..14
        return True
    if x <= 71 and y < 15:  # state word
        return True
    if 3 <= x <= 128 and 25 <= y:  # well digit rows 26..39
        return True
    if 129 <= x <= 176 and y >= 15:  # rate box
        return True
    return False

cnt = [Counter() for _ in range(16)]
for y in range(40):
    for x in range(320):
        if is_dynamic(x, y):
            continue
        cnt[vals[y][x]][im.getpixel((x, y))] += 1

for v in range(16):
    if cnt[v]:
        top = cnt[v].most_common(2)
        print('value', v, '->', top)