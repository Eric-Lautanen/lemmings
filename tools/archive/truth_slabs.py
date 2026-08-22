from PIL import Image
img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3_dos.png').convert('RGBA')
W, H = img.size
X0 = 489
px = img.load()

def is_terr(c):
    r, g, b, a = c
    if (r, g, b) == (0, 0, 51): return False
    if (r, g, b) == (0, 0, 0): return False
    if max(r, g, b) < 25: return False
    return True

def rowspans(y, xa, xb):
    spans = []
    run = None
    for x in range(xa, xb + 1):
        t = is_terr(px[x - X0, y])
        if t and run is None: run = x
        if not t and run is not None:
            if x - run >= 3: spans.append((run, x - 1))
            run = None
    if run is not None and xb + 1 - run >= 3: spans.append((run, xb))
    return spans

print('=== G1 band: draws (611,38),(675,38),(725,38) erases (611,40),(674,40),(730,40) ===')
for y in range(36, 76):
    print(f'y{y:3d}: {rowspans(y, 490, 900)}')
print()
print('=== G2 band: draws (539,58),(588,58) erases (539,60),(595,60) ===')
for y in range(56, 94):
    print(f'y{y:3d}: {rowspans(y, 490, 900)}')