import glob, os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'
for f in sorted(glob.glob(os.path.join(d, 'pa_*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    px = im.load()
    name = os.path.basename(f)

    def isgreen(r, g, b):
        return g > 130 and g > r + 40 and g > b + 40

    # build column occupancy per row-band; find dense 22-row windows with green
    # strip: for each y, count green
    rowcnt = [sum(1 for x in range(w) if isgreen(*px[x, y])) for y in range(h)]
    print(name, w, 'x', h)
    # print row counts in bands of 10
    for y in range(0, h, 10):
        band = sum(rowcnt[y:y + 10])
        if band > 30:
            print('  rows %3d..%3d: green=%d' % (y, min(y + 9, h - 1), band))
    print()