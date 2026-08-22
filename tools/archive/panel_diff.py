import base64, json
from PIL import Image

src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()

def getobj(key):
    i = src.find('"' + key + '"')
    j = src.find('}', i)
    return json.loads(src[i:j + 1])

def getstr(key, sub=None):
    pat = '"' + key + '"' + (('["' + sub + '"]') if sub else '')
    i = src.find(pat)
    j = src.find('"', i + len(pat) + 1)  # start of value string
    k = src.find('"', j + 1)
    return src[j + 1:k]

# panel: A.main.panel base64
i = src.find('"panel"')
j = src.find('"', i + 8)
k = src.find('"', j + 1)
panel_b64 = src[j + 1:k]
panel = base64.b64decode(panel_b64)
print('panel bytes:', len(panel))
# unpack4: 320x40 2bpp? see game.js toImg/unpack4 - check format quickly
# try 2bpp packed (320*40/4 = 3200 bytes)

# palette: A.main.gfxset? - just compare with capture colors directly
im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
px = im.load()

# decode panel as 4bpp
vals = []
for y in range(40):
    row = []
    for x in range(320):
        b = panel[(y * 320 + x) // 2]
        v = (b >> (4 * (1 - (x % 2)))) & 15
        row.append(v)
    vals.append(row)

print('panel art values x125..180, rows 16..39 (digit = 4bpp value):')
for yy in range(16, 40):
    row = ''.join(str(vals[yy][x]) for x in range(125, 180))
    print('y%d  %s' % (160 + yy, row))

# histogram of values used in the panel
from collections import Counter
cnt = Counter(vals[y][x] for y in range(40) for x in range(320))
print('values used:', sorted(cnt.items()))