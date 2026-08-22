'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const W = 1600;
function solidAt(x, y) { return y >= 0 && y < 400 && x >= 0 && x < W && L.solid[y * W + x] === 1; }
console.log('floor solidity at rows 94-98, columns 960-1000:');
for (let y = 94; y <= 98; y++) {
  let s = '';
  for (let x = 960; x <= 1000; x++) s += solidAt(x, y) ? '#' : '.';
  console.log('y' + y + ' ' + s);
}
console.log('pillar (974-989, 54-94) + floor check: floor at (974..989, 96) = '
  + [974, 975, 989, 990].map(x => x + ':' + solidAt(x, 96)).join(' '));