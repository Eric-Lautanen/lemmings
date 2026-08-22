import numpy as np
from PIL import Image

im0 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a.gif')
im0.seek(0)
im = np.array(im0.convert('RGB')).astype(int)

def mask(reg):
    bg1 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==51)
    bg2 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==0)
    return ~(bg1 | bg2 | (reg.max(axis=2)<30))

# world x 505..800 -> gif cols (505-489)*1.5625=25 .. (800-489)*1.5625=486
# world y 0..159 -> gif rows 0..221.6
reg = im[0:222, 25:487]
t = mask(reg)
out = []
for r in range(0, 222, 1):
    row = t[r]
    runs = []
    inr = False
    for c in range(len(row)):
        if row[c] and not inr: s = c; inr = True
        elif not row[c] and inr: runs.append((int(round(505 + s/1.5625)), int(round(505 + (c-1)/1.5625)))); inr = False
    if inr: runs.append((int(round(505 + s/1.5625)), int(round(505 + (len(row)-1)/1.5625))))
    wy = r/1.39375
    if runs:
        out.append(f'y{wy:6.1f}: {runs}')
with open(r'C:\Users\ericl\AppData\Local\Temp\opencode\frame0_profile.txt', 'w') as fh:
    fh.write('\n'.join(out))
print('rows with terrain:', len(out))
print('\n'.join(out[:80]))