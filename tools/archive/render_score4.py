import os, sys, json
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import ORIG
from parse_lvl import parse_level
import numpy as np
from PIL import Image

PNGD = r'C:\Users\ericl\AppData\Local\Temp\opencode\lemtools\png'
lv = parse_level(os.path.join(ORIG, 'level009.dat'), 6)
tids = sorted(set(t[3] for t in lv['terrains']))
arts = {}
for t in tids:
    im = np.array(Image.open(os.path.join(PNGD, f'gr3_terr{t}.png')).convert('RGBA'))
    mask = im[:, :, 3] > 0
    arts[t] = mask
    print(f'tid {t}: {im.shape[1]}x{im.shape[0]} solid={mask.sum()}')

W, H = 1600, 160

def render(xoff, up_flip, up_inv, yoff=0):
    solid = np.zeros((H, W), dtype=np.uint8)
    for (px, mods, py, tid) in lv['terrains']:
        a = arts.get(tid)
        if a is None: continue
        tw, th = a.shape[1], a.shape[0]
        erase = bool(mods & 1)
        up = bool(mods & 2)
        if up and up_inv: continue
        for yy in range(th):
            ly = py + yoff + (th - 1 - yy if up_flip else yy)
            if ly < 0 or ly >= H: continue
            for xx in range(tw):
                if not a[yy, xx]: continue
                lx = px + xoff + xx
                if lx < 0 or lx >= W: continue
                if erase:
                    solid[ly, lx] = 0
                else:
                    solid[ly, lx] = 1
    return solid

im = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3_dos.png').convert('RGBA')).astype(int)
bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
dark = im.max(axis=2) < 25
terrain = ~(bg1 | bg2 | dark)
truth = terrain
print('truth px', truth.sum())

x0 = 489
def win(s):
    return s[:, x0:x0+im.shape[1]]

best = None
for xoff in [14, 15, 16]:
    for upf in [False, True]:
        for upi in [False, True]:
            sol = render(xoff, upf, upi)
            w = win(sol)
            inter = np.logical_and(w, truth).sum()
            union = np.logical_or(w, truth).sum()
            score = inter / union if union else 0
            print(f'xoff={xoff} up_flip={upf} up_inv={upi}: IoU={score:.4f} inter={inter} union={union}')
            if best is None or score > best[0]:
                best = (score, xoff, upf, upi)
print('BEST', best)
sel = render(best[1], best[2], best[3])
w = win(sel)
print('render px in window:', w.sum())
xy = np.nonzero(w)
if len(xy[0]): print('render row range', xy[0].min(), xy[0].max(), 'col range', xy[1].min(), xy[1].max())