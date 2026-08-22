'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
const W = L.W;
for (let y = 88; y <= 140; y++) {
  let line = String(y).padStart(3) + ' ';
  for (let x = 380; x <= 1160; x += 2) line += L.solid[y * W + x] ? '#' : '.';
  console.log(line);
}
console.log('spawn', L.spawnX, L.spawnY, 'exit', L.exit.x, L.exit.y);
