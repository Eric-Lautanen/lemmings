'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.state.level = T.loadLevel(0); // UNCARVED
const L = T.state.level;
const W = L.W;
for (let y = 40; y <= 130; y++) {
  let r = String(y).padStart(3) + ' ';
  for (let x = 340; x <= 500; x++) r += L.solid[y * W + x] ? '#' : '.';
  console.log(r);
}
console.log('spawn', L.spawnX, L.spawnY, 'exit', L.exit.x, L.exit.y);