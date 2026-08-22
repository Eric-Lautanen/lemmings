import numpy as np
import subprocess, json, os

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

world = np.load(r'C:\github\Lemmings\world_fun3.npy')
hits = np.load(r'C:\github\Lemmings\hits_fun3.npy')

def runs_of(mask):
    out = []
    inrun = False
    for x in range(1600):
        if mask[x]:
            if not inrun: start = x; inrun = True
        else:
            if inrun: out.append((start, x-1)); inrun = False
    if inrun: out.append((start, 1599))
    return out

out_lines = []
for y in range(160):
    cov = hits[y] > 0
    gy = grid[y].astype(bool)
    wy = world[y].astype(bool)
    g_runs = runs_of(gy)
    w_runs = runs_of(wy & cov)          # gif solid within coverage
    both = runs_of((gy & wy & cov).astype(bool))
    only_w = runs_of((wy & cov & ~gy).astype(bool))
    only_g = runs_of((gy & ~wy).astype(bool))   # grid solid where gif saw air
    line = 'y%3d' % y
    if only_w or only_g:
        line += '  ** gifOnly:%s gridOnly:%s' % (only_w[:5], only_g[:5])
    out_lines.append(line)
    out_lines.append('     gif  : %s' % w_runs)
    out_lines.append('     grid : %s' % g_runs)

open(os.path.join(TGIF, 'stitch_diff2.txt'), 'w').write('\n'.join(out_lines))
print('done')