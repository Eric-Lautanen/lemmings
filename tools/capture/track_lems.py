import numpy as np
from PIL import Image
import subprocess, json, os, sys

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

def load_frames(gif):
    im = Image.open(os.path.join(TGIF, gif))
    frames = []
    for i in range(im.n_frames):
        im.seek(i)
        frames.append(np.array(im.convert('RGB')).astype(int))
    return frames

def calibrate(frame):
    H, W, _ = frame.shape
    im = frame
    bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
    bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
    dark = im.max(axis=2) < 30
    t = ~(bg1 | bg2 | dark)
    ph = int(round(H*160/200))
    t[ph:,:] = False
    sx = W/320.0; sy = ph/160.0
    r = np.arange(ph)
    wrows = np.clip((r/sy).astype(int), 0, 159)
    best = None
    for x0 in range(380, 800):
        wcols = np.clip((x0 + np.arange(W)/sx).astype(int), 0, 1599)
        win = grid[np.ix_(wrows, wcols)]
        inter = np.logical_and(win, t[:ph]).sum()
        union = np.logical_or(win, t[:ph]).sum()
        score = inter/union if union else 0
        if best is None or score > best[0]:
            best = (score, x0)
    return best[1], sx, sy

def diff_blobs(a, b, thr=60):
    d = np.abs(b - a).sum(axis=2)
    m = d > thr
    H, W = m.shape
    blobs = []
    visited = np.zeros_like(m)
    for y in range(H):
        for x in range(W):
            if m[y, x] and not visited[y, x]:
                stack = [(y, x)]
                visited[y, x] = 1
                pts = []
                while stack:
                    cy, cx = stack.pop()
                    pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy+dy, cx+dx
                            if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = 1
                                stack.append((ny, nx))
                if len(pts) >= 8:
                    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
                    blobs.append((round(np.mean(xs)), round(np.mean(ys)), len(pts)))
    return blobs

all_pos = []
for gif in ['fun3a.gif', 'fun3b.gif']:
    frames = load_frames(gif)
    x0, sx, sy = calibrate(frames[0])
    print(gif, 'x0=%.0f sx=%.3f sy=%.3f' % (x0, sx, sy))
    for i in range(0, len(frames)-3, 2):
        blobs = diff_blobs(frames[i], frames[i+3])
        for (gx, gy, n) in blobs:
            wx = x0 + gx/sx
            wy = gy/sy
            if 0 <= wx <= 1600 and 0 <= wy <= 159:
                all_pos.append((round(wx*2)/2, round(wy*2)/2, i))
print('total lemming observations:', len(all_pos))

# stats: density in world cells (rounded to 4px buckets)
buck = {}
for (wx, wy, f) in all_pos:
    k = (int(wx)//4*4, int(wy)//4*4)
    buck[k] = buck.get(k, 0) + 1
# print path regions: rows 45..160 with occupancy map
occ = np.zeros((160, 400), dtype=np.uint8)
for k, v in buck.items():
    bx, by = k
    if 380 <= bx < 780 and 0 <= by < 160 and v >= 2:
        occ[by, bx-380] = 1
# print occupancy as rows with runs
def runs(mask):
    out = []
    inrun = False
    for i in range(len(mask)):
        if mask[i]:
            if not inrun: s = i; inrun = True
        else:
            if inrun: out.append((s+380, i-1+380)); inrun = False
    if inrun: out.append((s+380, len(mask)-1+380))
    return out
for y in range(0, 160):
    rs = runs(occ[y])
    if rs:
        print('lemocc y%3d: %s' % (y, rs))