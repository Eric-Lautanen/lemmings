from PIL import Image
import numpy as np

im0 = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a_f000.png').convert('RGB'))
im1 = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a_f100.png').convert('RGB'))
im2 = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a_f200.png').convert('RGB'))

def top(im):
    flat = im.reshape(-1,3)
    cols, cnt = np.unique(flat, axis=0, return_counts=True)
    idx = np.argsort(cnt)[::-1][:40]
    return {tuple(cols[i]): int(cnt[i]) for i in idx}

t0 = top(im0)
for f, name in [(im1,'f100'), (im2,'f200')]:
    print('====', name)
    t = top(f)
    for col, c in t.items():
        delta = c - t0.get(col, 0)
        mark = ' NEW' if delta > 150 else ''
        if col in t0 or delta > 150:
            print('  %s %6d delta %+d%s' % (col, c, delta, mark))