'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
for (let y = 136; y <= 162; y++) {
  let line = '';
  for (let x = 470; x <= 920; x++) line += L.solid[y * 1600 + x] ? '#' : '.';
  console.log('y=' + y + ' [' + line + ']');
}
