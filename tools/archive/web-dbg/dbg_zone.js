'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.state.level = T.loadLevel(0);
const L = T.state.level;
for (let y = 110; y <= 135; y++) {
  let line = String(y).padStart(3) + ' ';
  for (let x = 380; x <= 480; x++) line += L.solid[y * L.W + x] ? '#' : '.';
  console.log(line);
}