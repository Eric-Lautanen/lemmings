import numpy as np
from PIL import Image

im0 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a.gif')
im0.seek(0)
im = np.array(im0.convert('RGB')).astype(int)

def mask(reg):
    bg1 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==51)
    bg2 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==0)
    return ~(bg1 | bg2 | (reg.max(axis=2)<30))

# world y 0..28 -> gif rows 0..39; x 505..793 -> cols 25..475
reg = im[0:40, 25:476]
t = mask(reg)
print('world y / gif row / solid runs in x505-793 (gif cols 25..475 -> world 489+c/1.5625):')
for r in range(0, 40):
    row = t[r]
    runs = []
    inr = False
    for c in range(len(row)):
        if row[c] and not inr: s = c; inr = True
        elif not row[c] and inr: runs.append((s + 505, c - 1 + 505)); inr = False
    if inr: runs.append((s + 505, len(row) - 1 + 505))
    wy = r / 1.39375
    print(f'y_world~{wy:5.1f} (gifrow {r:2d}): {runs}')