import numpy as np
from PIL import Image

im0 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a.gif')
im0.seek(0)
im = np.array(im0.convert('RGB')).astype(int)
H, W, _ = im.shape
print('gif size', W, 'x', H)

def px(wx, wy):
    c = int(round((wx - 505) * 1.5625)) if wx >= 505 else None
    r = int(round(wy * 1.39375))
    if c is None or c < 0 or c >= W or r < 0 or r >= H:
        return None
    return tuple(im[r, c])

# full color histogram of the frame
from collections import Counter
cnt = Counter()
for r in range(H):
    for c in range(W):
        cnt[tuple(im[r, c])] += 1
print('total distinct colors:', len(cnt))
print('top 30 colors (rgb: count):')
for col, n in cnt.most_common(30):
    print(f'  {col}: {n}')

print()
print('samples (world x, world y) -> gif rgb:')
for wy in [0, 1, 2, 3, 4, 8, 10, 12, 16, 20, 22, 24, 28, 33, 37, 38, 39, 42, 45, 50, 55, 57, 60, 65, 70, 75, 80, 95, 98, 100, 105, 110, 118, 120, 125, 130, 135, 140, 145, 148, 150, 152, 153, 154, 155, 156, 157, 158]:
    row = []
    for wx in [505, 510, 520, 540, 560, 590, 600, 612, 618, 620, 623, 630, 644, 650, 660, 676, 690, 710, 725, 740, 754, 760, 770, 790, 800]:
        p = px(wx, wy)
        if p is not None and max(p) > 0 and p != (0, 0, 51):
            row.append(f'{wx}:{p}')
    if row:
        print(f'y{wy:3d} ' + ' '.join(row))