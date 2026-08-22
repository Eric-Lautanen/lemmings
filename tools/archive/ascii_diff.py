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

# segment into 6 ranges of 80 cols, ASCII: '.'=void '#'=both 'G'=gif only 'g'=grid only(hit, air) 'x'=grid only unseen
seg = [('A', 380, 560), ('B', 560, 740), ('C', 740, 820)]
for y in range(30, 160):
    for name, x0, x1 in seg:
        line = ''
        for x in range(x0, x1):
            gg = grid[y, x]
            ww = world[y, x] if hits[y, x] else -1
            if gg and ww == 1: c = '#'
            elif not gg and ww == 1: c = 'G'
            elif gg and ww == 0: c = 'g'
            elif gg and ww == -1: c = '?'
            elif not gg and ww == 0: c = '.'
            else: c = '.'
            line += c
        print('y%3d %s %s' % (y, name, line))
    print()