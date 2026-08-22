import numpy as np
from PIL import Image

web = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\web_panel.raw') if False else None)
# load raw rgb
web = np.fromfile(r'C:\Users\ericl\AppData\Local\Temp\opencode\web_panel.raw', dtype=np.uint8, sep=',').reshape(40, 320, 3)
cap = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB'))
cap = cap[160:200, :, :]

# diff: show regions where web and capture differ (color distance > 40)
print('WEB own pixels x125..180 y178..199 (G=green W=white o=other):')
for y in range(178, 200):
    row = ''
    for x in range(125, 180):
        w = web[y - 160, x].astype(int)
        cg = w[1] > 100 and w[0] < 80
        cw = w[0] > 180 and w[1] > 150
        if cg: row += 'G'
        elif cw: row += 'W'
        elif w.sum() > 40: row += 'o'
        else: row += '.'
    print('y%d  %s' % (160 + y, row))
print('FULL diff x0..320 y160..199 (G=cap green W=cap white !=other mismatch .=same):')
for y in range(160, 200):
    row = ''
    for x in range(0, 320):
        w = web[y - 160, x].astype(int)
        c = cap[y - 160, x].astype(int)
        dw = abs(w - c).sum()
        cg = c[1] > 100 and c[0] < 80
        cw = c[0] > 180 and c[1] > 150
        if dw > 60:
            if cg: row += 'G'
            elif cw: row += 'W'
            else: row += '!'
        else:
            row += '.'
    print('y%d  %s' % (y, row))
print()
for y in range(178, 200):
    row = ''
    for x in range(125, 180):
        w = web[y - 160, x].astype(int)
        c = cap[y - 160, x].astype(int)
        dw = abs(w - c).sum()
        cg = c[1] > 100 and c[0] < 80
        cw = c[0] > 180 and c[1] > 150
        if dw > 60:
            if cg: row += 'G'
            elif cw: row += 'W'
            else: row += '!'
        else:
            row += '.'
    print('y%d  %s' % (160 + y, row))