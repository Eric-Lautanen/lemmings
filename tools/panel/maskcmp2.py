from PIL import Image
G = (0, 170, 0); W = (240, 208, 208); NE = None
exp = {}
def add(pairs):
    for (rx, ry), c in pairs: exp[(rx, ry)] = c

add([((4, 2), W), ((5, 2), W), ((6, 2), W), ((7, 2), W)])
for ry in (3, 4, 5):
    add([((4, ry), G), ((5, ry), G), ((6, ry), G), ((7, ry), W)])
add([((0, 6), W), ((1, 6), W), ((2, 6), W), ((3, 6), G), ((4, 6), G),
     ((5, 6), G), ((6, 6), G), ((7, 6), W), ((8, 6), W), ((9, 6), W), ((10, 6), W), ((11, 6), W)])
for ry in (7, 8, 9):
    add([((rx, ry), G) for rx in range(0, 11)])
    add([((11, ry), W)])
add([((4, 10), G), ((5, 10), G), ((6, 10), G), ((7, 10), G)])
for ry in (11, 12, 13):
    add([((4, ry), G), ((5, ry), G), ((6, ry), G), ((7, ry), W)])

for f in ['vgalemmi_002', 'vgalemmi_004']:
    im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\%s.png' % f).convert('RGB')
    px = im.load()
    mism = 0
    for (rx, ry), c in exp.items():
        x, y = 19 + rx, 184 + ry
        r, g, b = px[x, y]
        got = NE
        if g > 100 and r < 80 and b < 80: got = G
        elif r > 230 and g > 190 and b > 190: got = W
        if got != c:
            mism += 1
            print('%s MISMATCH rel(%d,%d) exp=%s got=%s rgb=%s' % (f, rx, ry, c, got, (r, g, b)))
    print('%s: %d mismatches / %d px' % (f, mism, len(exp)))