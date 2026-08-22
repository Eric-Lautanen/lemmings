from PIL import Image

sm = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\pa5_smoke.png').convert('RGB')
band = sm.crop((0, 640, 1280, 704))  # strip rows in 4x space
band = band.resize((320, 16), Image.NEAREST)
spx = band.load()

im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png').convert('L')
px = im.load()

diffs = 0
for y in range(16):
    for x in range(320):
        a = 1 if (spx[x, y][1] > 100 and spx[x, y][0] < 60) else 0
        b = 1 if px[x, 160 + y] != 0 else 0
        if a != b:
            diffs += 1
            if x < 70:
                continue  # WALKER area intentionally skipped
print('mask diffs vs og_004 (excluding x<70):', diffs)
