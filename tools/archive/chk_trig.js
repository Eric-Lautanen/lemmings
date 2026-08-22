const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const A = window.GAME_ASSETS;
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
console.log('gfx:', L.gfx, 'entrances:', L.entrances.length, 'order:', JSON.stringify(L.order));
console.log('spawn:', L.spawnX, L.spawnY);
const g = A.gfx[L.gfx];
for (const id of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
  const tr = g.triggers[id];
  if (tr) console.log('id', id, 'trigger', JSON.stringify(tr), 'frames', g.objects[id] ? g.objects[id].n : '-');
}
