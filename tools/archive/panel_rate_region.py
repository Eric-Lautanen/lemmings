import base64
src = open(r'C:\github\Lemmings\web\assets.js', encoding='utf-8', errors='replace').read()
i = src.find('"panel"')
j = src.find('"', i + 8)
k = src.find('"', j + 1)
panel = base64.b64decode(src[j + 1:k])
vals = [[(panel[(y * 320 + x) // 2] >> (4 * (1 - (x % 2)))) & 15 for x in range(320)] for y in range(40)]
for yy in range(15, 40):
    row = ''.join(str(vals[yy][x]) for x in range(129, 210))
    print('y%d %s' % (160 + yy, row))