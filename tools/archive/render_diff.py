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
    arts[t] = im[:, :, 3] > 0

W, H = 1600, 160
def render(xoff, up_inv, include_objects):
    solid = np.zeros((H, W), dtype=np.uint8)
    for (px, mods, py, tid) in lv['terrains']:
        a = arts.get(tid)
        if a is None: continue
        tw, th = a.shape[1], a.shape[0]
        erase = bool(mods & 1)
        up = bool(mods & 2)
        if up and up_inv: continue
        for yy in range(th):
            ly = py + yy
            if ly < 0 or ly >= H: continue
            for xx in range(tw):
                if not a[yy, xx]: continue
                lx = px + xoff + xx
                if lx < 0 or lx >= W: continue
                if erase: solid[ly, lx] = 0
                else: solid[ly, lx] = 1
    if include_objects:
        # objects as solid boxes (approx) - entrance (608,4) 64x34, exit (592,136) 32x16?, door (592,128)
        for o in lv['objs']:
            ox, oy, oid, mods, b7 = o[0], o[1], o[2], o[3], o[4]
            im2 = np.array(Image.open(os.path.join(PNGD, f'gr3_obj{oid}_f0.png')).convert('RGBA'))
            mask = im2[:, :, 3] > 0
            for yy in range(mask.shape[0]):
                ly = oy + yy
                if ly < 0 or ly >= H: continue
                for xx in range(mask.shape[1]):
                    if not mask[yy, xx]: continue
                    lx = ox + xx
                    if lx < 0 or lx >= W: continue
                    solid[ly, lx] = 1
    return solid

im = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3_dos.png').convert('RGBA')).astype(int)
bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
dark = im.max(axis=2) < 25
truth = ~(bg1 | bg2 | dark)
x0 = 489
sol = render(15, True, False)
solO = render(15, True, True)
w = sol[:, x0:x0+im.shape[1]]
wO = solO[:, x0:x0+im.shape[1]]
print('terrain only IoU:', np.logical_and(w, truth).sum() / np.logical_or(w, truth).sum())
print('with objects IoU:', np.logical_and(wO, truth).sum() / np.logical_or(wO, truth).sum())

for y in range(160):
    tr = truth[y]
    rw = wO[y]
    runs_t, runs_r = [], []
    inr = False
    for c in range(im.shape[1]):
        wx = x0 + c
        if tr[c] and not inr: s = wx; inr = True
        elif not tr[c] and inr: runs_t.append((s, wx-1)); inr = False
    if inr: runs_t.append((s, x0+im.shape[1]-1))
    inr = False
    for c in range(im.shape[1]):
        wx = x0 + c
        if rw[c] and not inr: s = wx; inr = True
        elif not rw[c] and inr: runs_r.append((s, wx-1)); inr = False
    if inr: runs_r.append((s, x0+im.shape[1]-1))
    if runs_t != runs_r:
        print(f'y{y:3d} truth:{runs_t}')
        print(f'y{y:3d} rend :{runs_r}')