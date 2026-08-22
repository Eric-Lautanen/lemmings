import base64, json, numpy as np

src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()
i = src.find('"font": {')
j = src.find('}', i)
fontobj = json.loads(src[i + 8:j + 1])
raw = base64.b64decode(fontobj['O'])
px = [[0] * 8 for _ in range(16)]
for plane in range(3):
    for row in range(16):
        b = raw[plane * 16 + row]
        for col in range(8):
            if b & (1 << (7 - col)):
                px[row][col] = 1
print('decoded O:')
for r in px:
    print(''.join('#' if v else '.' for v in r))

web = np.fromfile(r'C:\Users\ericl\AppData\Local\Temp\opencode\web_panel.raw', dtype=np.uint8, sep=',').reshape(40, 320, 3)
print('web rendered at x112 (from web_panel.raw):')
for y in range(16):
    row = ''.join('#' if (web[y, 112 + x, 1] > 100 and web[y, 112 + x, 0] < 80) else '.' for x in range(8))
    print(row)
