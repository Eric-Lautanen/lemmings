'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetSection(0);
const L = T.state.level;
const W = L.W;
const H = L.H;
console.log('level', L.idx, 'size', W, 'x', H, 'spawn', L.spawnX, L.spawnY, 'exit', L.exit.x, L.exit.y, 'rate', L.rate, 'lems', L.lems, 'rescue', L.rescueNeed, 'skills', JSON.stringify(L.skills));
for (let y = 0; y < H; y += 16) {
  let r = String(y).padStart(4) + ' ';
  for (let x = 0; x < W; x += 8) r += L.solid[y * W + x] ? '#' : '.';
  console.log(r);
}