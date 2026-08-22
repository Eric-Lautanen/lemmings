import numpy as np, json, os
from PIL import Image
import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lv = assets['levels'][78]

# port grid approximation (no flags) from python unpack (same as build pipeline)
import base64
def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w * h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2 * i] = (b >> 4) & 0xF
        if 2 * i + 1 < w * h: px[2 * i + 1] = b & 0xF
    return px.reshape(h, w)

tiles = {i: unpack_px(t['d'], t['w'], t['h']) if t else None for i, t in enumerate(assets['gfx'][3]['terrains'])}
port = np.zeros((160, 1600), dtype=np.uint8)
for (x, mods, y, tid) in lv['terrain']:
    t = tiles[tid]
    if t is None: continue
    h, w = t.shape
    y = int(round(y))
    for yy in range(h):
        ly = y + yy
        if ly < 0 or ly >= 160: continue
        for xx in range(w):
            if t[yy, xx] == 0: continue
            lx = x + xx
            if 0 <= lx < 1600: port[ly, lx] = 1

def terrain_mask(im):
    H, W, _ = im.shape
    im = im.astype(int)
    bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
    bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
    dark = im.max(axis=2) < 30
    t = ~(bg1 | bg2 | dark)
    ph = int(round(H*160/200))
    t[ph:,:] = False
    return t, ph

def score_frame(im):
    t, ph = terrain_mask(im)
    H, W, _ = im.shape
    sx = W/320.0; sy = ph/160.0
    r = np.arange(ph)
    wrows = np.clip((r/sy).astype(int), 0, 159)
    out = []
    for x0 in range(440, 560):
        wcols = np.clip((x0 + np.arange(W)/sx).astype(int), 0, 1599)
        win = port[np.ix_(wrows, wcols)]
        inter = np.logical_and(win, t[:ph]).sum()
        union = np.logical_or(win, t[:ph]).sum()
        out.append((inter/union if union else 0, x0, inter, union))
    return max(out), t, ph

im0 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a.gif')
print('frames:', im0.n_frames, 'size:', im0.size)
for i in range(0, 30, 2):
    im0.seek(i)
    im = np.array(im0.convert('RGB'))
    (score, x0, inter, union), t, ph = score_frame(im)
    print(f'f{i:3d} score={score:.3f} x0={x0} inter={inter} union={union} terrain_px={t.sum()} ph={ph}')
# also check background color histogram of one frame
im0.seek(0)
im = np.array(im0.convert('RGB')).astype(int)
H, W, _ = im.shape
top = im[:H//2].reshape(-1, 3)
vals, cnts = np.unique(top, axis=0, return_counts=True)
order = np.argsort(-cnts)[:6]
print('top colors:')
for v, c in zip(vals[order], cnts[order]):
    print(' ', tuple(v), c)