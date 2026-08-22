import numpy as np
from PIL import Image
import subprocess, json, sys, os

TGIF = r'C:\github\Lemmings\tools\capture\native'
os.chdir(r'C:\github\Lemmings')

js = r'''
const fs = require('fs'); const path = require('path'); const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join('build','assets.js'),'utf8'),{filename:'assets.js'});
vm.runInThisContext(fs.readFileSync(path.join('web','game.js'),'utf8'),{filename:'game.js'});
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
const g = [];
for (let y=0;y<160;y++){ const row=[];
  for (let x=0;x<1600;x++) row.push(L.solid[y*1600+x]);
  g.push(row.join(''));
}
process.stdout.write(JSON.stringify({grid:g}));
'''
out = subprocess.run(['node','-e',js], capture_output=True, text=True, cwd=r'C:\github\Lemmings')
grid = np.array([[int(c) for c in row] for row in json.loads(out.stdout)['grid']], dtype=np.uint8)

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

def calibrate(im):
    t, ph = terrain_mask(im)
    H, W, _ = im.shape
    sx = W/320.0
    sy = ph/160.0
    r = np.arange(ph)
    wrows = np.clip((r/sy).astype(int), 0, 159)
    best = None
    tflat = t[:ph].ravel()
    for x0 in range(0, 1281):
        wcols = np.clip((x0 + np.arange(W)/sx).astype(int), 0, 1599)
        win = grid[np.ix_(wrows, wcols)]
        inter = np.logical_and(win, t[:ph]).sum()
        union = np.logical_or(win, t[:ph]).sum()
        score = inter/union if union else 0
        if best is None or score > best[0]:
            best = (score, x0, inter, union)
    return best, t, ph

def runs(rowmask, x0, sx):
    out = []
    inrun = False
    for cc in range(len(rowmask)):
        if rowmask[cc]:
            if not inrun: start = x0 + cc/sx; inrun = True
        else:
            if inrun: out.append((start, x0 + (cc-1)/sx)); inrun = False
    if inrun: out.append((start, x0 + (len(rowmask)-1)/sx))
    return out

# accumulate world mask from many frames of both gifs
world = np.zeros((160, 1600), dtype=np.uint8)
world_hits = np.zeros((160, 1600), dtype=np.uint8)
frame_info = []
for gif, nf in [('fun3a.gif', 211), ('fun3b.gif', 146)]:
    gpath = os.path.join(TGIF, gif)
    im0 = Image.open(gpath)
    for i in range(0, nf, 3):
        im0.seek(i)
        im = np.array(im0.convert('RGB'))
        (score, x0, inter, union), t, ph = calibrate(im)
        H, W, _ = im.shape
        sx = W/320.0
        sy = ph/160.0
        # mark world cells solid if >=60% of the mapped gif pixels are terrain
        for yy in range(160):
            g = int(round(yy*sy))
            if g >= ph: continue
            cols = (x0 + np.arange(W)/sx).astype(int)
            sel = np.logical_and(cols>=0, cols<1600)
            cc = cols[sel]
            cnt = np.bincount(cc, weights=t[g][sel].astype(int), minlength=1600)
            tot = np.bincount(cc, minlength=1600)
            solid = cnt >= 0.6*tot
            world[yy][solid.astype(bool)] = 1
            world_hits[yy][solid.astype(bool)] += 1
        frame_info.append((gif, i, round(score,3), x0))
        print('cal %s f%03d score=%.3f x0=%d' % (gif, i, score, x0))
print('total frames', len(frame_info))
np.save(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), 'world_fun3.npy'), world)
np.save(os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), 'hits_fun3.npy'), world_hits)
print('saved world_fun3.npy', world.sum(), 'cells')
