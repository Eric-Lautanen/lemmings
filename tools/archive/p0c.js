'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
const W = 1600;
function solid(x, y) { return y >= 0 && y < 400 && x >= 0 && x < W && L.solid[y * W + x] === 1; }
console.log('terrain 660-900 rows 30-140:');
for (let y = 30; y <= 140; y += 2) {
  let s = '';
  for (let x = 660; x <= 900; x++) s += solid(x, y) ? '#' : '.';
  console.log('y' + y + ' ' + s);
}
function findGround(x, gy) {
  var r = 0;
  if (solid(x, gy)) { while (solid(x, gy + r - 1) && r > -10) r--; }
  else { r = 1; while (!solid(x, gy + r) && r < 4) r++; }
  return r;
}
let watched = null;
for (let t = 0; t < 3000 && !T.state.over; t++) {
  T.stepSim(L);
  for (const lem of T.state.lems) {
    if (lem.dead || lem.rescued) continue;
    const x = Math.round(lem.x), y = Math.round(lem.y);
    if (!watched && x >= 700 && x <= 760 && lem.state === 'walk' && lem.dir > 0) watched = lem;
    if (watched === lem && x >= 800 && x <= 870) {
      const nfx = x + (lem.dir > 0 ? 11 : 0) + lem.dir;
      const gy = y + 1 + 0;
      const dy = findGround(nfx, y + 1);
      const sdy = findGround(x + lem.dir, y + 1);
      console.log('t' + t + ' x=' + x + ' y=' + y + ' dir=' + lem.dir + ' s=' + lem.state
        + ' nose(' + (nfx) + ',' + (y + 1) + ')dy=' + dy + ' own(' + (x + lem.dir) + ')sdy=' + sdy);
    }
  }
}