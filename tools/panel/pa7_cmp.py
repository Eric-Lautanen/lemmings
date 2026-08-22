import numpy as np
from PIL import Image

def load_web(idx):
    raw = np.fromfile(r'C:\github\Lemmings\tools\panel\web_panel_%d.raw' % idx, dtype=np.uint8, sep=',')
    return raw.reshape(40, 320, 3)

def load_cap(name):
    cap = np.array(Image.open(r'C:\github\Lemmings\tools\capture\native\%s.png' % name).convert('RGB'))
    return cap[160:200, :, :]

def cmp(web, cap, label):
    d = np.abs(web.astype(int) - cap.astype(int)).sum(axis=2)
    bad = d > 60
    total = bad.sum()
    print('=== %s: %d/%d mismatched pixels (%.2f%%)' % (label, total, 320 * 40, 100.0 * total / (320 * 40)))
    # region breakdown
    regions = [('strip 0..47', 0, 48), ('out 104..152', 104, 153), ('in 176..232', 176, 233),
               ('time 240..320', 240, 320), ('rate 0..32', 0, 33), ('skills 32..160', 32, 160),
               ('pause/nuke 160..192', 160, 193), ('minimap 192..320', 192, 320)]
    for rn, x0, x1 in regions:
        c = bad[:, x0:x1].sum()
        if c:
            print('  %-20s x%3d..%3d: %4d' % (rn, x0, x1, c))
    for y in range(40):
        row = ''
        for x in range(320):
            if bad[y, x]:
                c = cap[y, x].astype(int)
                if c[1] > 100 and c[0] < 80: row += 'G'
                elif c[0] > 180 and c[1] > 150: row += 'W'
                elif c[0] > 150 and c[1] < 80 and c[2] < 80: row += 'R'
                elif c.sum() > 40: row += '!'
                else: row += '.'
            else:
                row += '.'
        print('y%d %s' % (160 + y, row))
    print()

cmp(load_web(0), load_cap('vgalemmi_002'), 'web Fun1 vs vgalemmi_002')
cmp(load_web(1), load_cap('vgalemmi_004'), 'web Fun2 vs vgalemmi_004')