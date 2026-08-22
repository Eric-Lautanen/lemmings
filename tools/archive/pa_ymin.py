import os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def isgreen(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

shots = {
    'ref': (r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png', 0),
    '6c9': (os.path.join(d, 'pa_6c9.png'), 0),
    'd30': (os.path.join(d, 'pa_d30.png'), 0),
    'dc9': (os.path.join(d, 'pa_dc9.png'), 0),
    'ff5': (os.path.join(d, 'pa_ff5.png'), 0),
}
# gx -> 1x coords; x_img = 2*gx + off
fields = {
    'A': [113,121,129], 'B': [145], 'C': [186,193],
    'D': [209,217,225], 'E': [249,258,265,273], 'F': [289,297,305,313],
}
for sname, (path, off) in shots.items():
    im = Image.open(path).convert('RGB')
    px = im.load()
    print('####', sname)
    for label, xs in fields.items():
        line = []
        for gx in xs:
            x0 = 2 * gx + 1  # local try
            ys = [y for y in range(300, 380) for dx in range(0, 12)
                  if isgreen(px, x0 + dx, y)]
            if not ys:
                line.append('%s=%4d: --' % (label, gx))
            else:
                line.append('%s=%4d: y%d..%d' % (label, gx, min(ys), max(ys)))
        for s in line:
            print('  ' + s)
    print()