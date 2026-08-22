'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
console.log('level name:', L.name, 'idx:', L.idx);
for (let li = 0; li < window.GAME_ASSETS.levels.length; li++) {
  const lv = window.GAME_ASSETS.levels[li];
  console.log(`levels[${li}]: name=${lv.name} terrain=${lv.terrain.length} objs=${lv.objects.length}`);
}
const lv = window.GAME_ASSETS.levels[L.idx];
console.log('--- using levels[L.idx=' + L.idx + '] ---');
const g = window.GAME_ASSETS.gfx[L.gfx];
const ts = g.terrains;
for (const te of lv.terrain) {
  console.log(JSON.stringify(te));
}