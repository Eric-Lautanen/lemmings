const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
for (let i = 0; i < 15; i++) console.log(i, JSON.stringify(A.menu[i].rank + ' ' + A.menu[i].num + ': ' + A.menu[i].name.trim()), 'skills', A.menu[i].skills.join(','));
// entrance object frames: obj id 1 in each gfxset
for (let g = 0; g < 4; g++) {
  const o = A.gfx[g] && A.gfx[g].objects[1];
  console.log('gfx', g, 'entrance obj:', o ? 'w' + o.w + ' h' + o.h + ' s' + o.s + ' n' + o.n + ' frames:' + (o.f ? Object.keys(o.f).join(',') : 'none') : 'none');
}