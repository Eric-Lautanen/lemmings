import os
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def runs(name, off):
    path = os.path.join(D, 'pa_%s.png' % name)
    im = Image.open(path).convert('RGB')
    px = im.load()
    # per-row-pair, list runs of set columns, chips of 2px cols
    for gy in range(11):
        y0 = 328 + 2 * gy
        cur = []
        line = []
        for gx in range(100, 320):
            x = 2 * gx + off
            on = False
            for dx in range(2):
                for dy in range(2):
                    if is_green(px, x + dx, y0 + dy):
                        on = True
            line.append(on)
        # runs
        rs = []
        i = 0
        while i < len(line):
            if line[i]:
                j = i
                while j < len(line) and line[j]:
                    j += 1
                rs.append((i, j - 1))
                i = j
            i += 1
        if rs:
            print('gy%d: %s' % (gy, ' '.join('%d-%d' % (a + 100, b + 100) for a, b in rs)))

for name in ['2f1', '229', '8dc', 'ff5']:
    print('==', name)
    runs(name, 0)