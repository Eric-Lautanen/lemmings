import numpy as np
from PIL import Image

im = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3_dos.png').convert('RGB')).astype(int)
H, W, _ = im.shape
print('size', W, 'x', H)

bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
dark = im.max(axis=2) < 25
terrain = ~(bg1 | bg2 | dark)
print('terrain px', terrain.sum())

from collections import Counter
cnt = Counter()
inds = np.nonzero(terrain)
for i in range(min(50000, len(inds[0]))):
    r, c = inds[0][i], inds[1][i]
    cnt[tuple(im[r, c])] += 1
print('top terrain colors:')
for col, n in cnt.most_common(12):
    print('  ', col, n)

# playfield: rows 0..159 -> world y 0..159 ; cols -> world x = 489 + c
# exclude lemming colors: blue (68,68,238), gray (221,221,221), pink? green (0,187,0)
lem = np.zeros_like(terrain)
for col in [(68,68,238),(221,221,221),(255,221,221),(0,187,0),(255,255,255)]:
    lem |= (im[:,:,0]==col[0])&(im[:,:,1]==col[1])&(im[:,:,2]==col[2])
t2 = terrain & ~lem

for y in range(160):
    if y >= H: break
    row = t2[y, :]
    runs = []
    inr = False
    for c in range(W):
        if row[c] and not inr: s = c; inr = True
        elif not row[c] and inr: runs.append((489+s, 489+c-1)); inr = False
    if inr: runs.append((489+s, 489+W-1))
    if runs:
        print(f'y{y:3d}: {runs}')