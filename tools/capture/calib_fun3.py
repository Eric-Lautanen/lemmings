import numpy as np
from PIL import Image
import subprocess, json, sys, os

os.chdir(r'C:\github\Lemmings')

# build the solid grid for menu slot 2 (Fun 3) using the port engine via node
js = r'''
const fs = require('fs'); const path = require('path'); const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join('build','assets.js'),'utf8'),{filename:'assets.js'});
vm.runInThisContext(fs.readFileSync(path.join('web','game.js'),'utf8'),{filename:'game.js'});
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
// solid grid rows 0..159
const g = [];
for (let y=0;y<160;y++){ const row=[];
  for (let x=0;x<1600;x++) row.push(L.solid[y*1600+x]);
  g.push(row.join(''));
}
process.stdout.write(JSON.stringify({grid:g}));
'''
out = subprocess.run(['node','-e',js], capture_output=True, text=True, cwd=r'C:\github\Lemmings')
data = json.loads(out.stdout)
grid = np.array([[int(c) for c in row] for row in data['grid']], dtype=np.uint8)
print('grid', grid.shape, 'solid cells', grid.sum())

# GIF terrain mask
im = np.array(Image.open(sys.argv[1]).convert('RGB')).astype(int)  # H x W x 3
H, W, _ = im.shape
print('gif', W, H)
# background = navy (0,0,51) and black; terrain = anything clearly brighter
bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
dark = im.max(axis=2) < 25
terrain = ~(bg1 | bg2 | dark)
# exclude bottom UI strip: DOS screen 320x200 -> playfield rows 0-159 -> gif rows 0..(159/200*H)
ph = int(round(H*160/200))
terrain[ph:,:] = False
print('terrain gif pixels', terrain.sum())

# scale factors
sx = W/320.0
sy = ph/160.0
print('scale', sx, sy)

# search camera offset x0: world col x visible at gif col c: x = x0 + c/sx
best = None
for x0 in range(0, 1281):
    # build gif-col -> world-col mapping for gif cols
    wcols = x0 + np.arange(W)/sx
    wcols_i = np.clip(wcols.astype(int), 0, 1599)
    # world rows for gif rows: y = r/sy
    r = np.arange(ph)
    wrows_i = np.clip((r/sy).astype(int), 0, 159)
    win = grid[np.ix_(wrows_i, wcols_i)]
    inter = np.logical_and(win, terrain[:ph]).sum()
    union = np.logical_or(win, terrain[:ph]).sum()
    score = inter/union if union else 0
    if best is None or score > best[1]:
        best = (x0, score, inter, union)
print('best x0=', best[0], 'IoU=', round(best[1],3), 'inter', best[2], 'union', best[3])

x0 = best[0]
# dump: for the camera window, print per-row solid runs of BOTH grid-window and gif mask for y 140..159 (pit area)
print('--- row comparison y140..159 (grid vs gif), world x range =', x0, '..', x0+int(W/sx))
for yy in range(140, 160):
    gcol = int(round(yy*sy))
    runs_g = []
    cols = wcols_i
    inrun = False
    for cc in range(W):
        if win[gcol, cc]:
            if not inrun: start = cols[cc]; inrun = True
        else:
            if inrun: runs_g.append((start, cols[cc-1])); inrun = False
    if inrun: runs_g.append((start, cols[W-1]))
    runs_t = []
    inrun = False
    for cc in range(W):
        if terrain[gcol, cc]:
            if not inrun: start = x0 + cc/sx; inrun = True
        else:
            if inrun: runs_t.append((start, x0 + (cc-1)/sx)); inrun = False
    if inrun: runs_t.append((start, x0 + (W-1)/sx))
    print('y%3d grid:%s' % (yy, runs_g))
    print('y%3d gif :%s' % (yy, runs_t))
