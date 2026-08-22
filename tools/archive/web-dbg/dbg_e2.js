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
for (let y = 84; y <= 132; y++) {
  let r = ''.padStart(4) + y + ' ';
  for (let x = 500; x <= 650; x += 1) r += L.solid[y * W + x] ? '#' : '.';
  console.log(r);
}