import numpy as np
import subprocess, json, os

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

def runs(mask, x0=0):
    out = []
    inrun = False
    for i in range(len(mask)):
        if mask[i]:
            if not inrun: s = i; inrun = True
        else:
            if inrun: out.append((s+x0, i-1+x0)); inrun = False
    if inrun: out.append((s+x0, len(mask)-1+x0))
    return out

for y in range(0, 160):
    g = runs(grid[y].astype(bool))
    w = runs((world[y]*hits[y].astype(bool)).astype(bool))
    print('y%3d grid:%s' % (y, g))
    print('     gif :%s' % w)