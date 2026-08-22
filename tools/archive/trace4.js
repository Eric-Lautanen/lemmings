'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
for (let y = 130; y <= 160; y++) {
  let runs = [];
  let start = -1;
  for (let x = 0; x <= 1600; x++) {
    const v = x < 1600 && L.solid[y * 1600 + x];
    if (v && start < 0) start = x;
    if (!v && start >= 0) { runs.push(start + '-' + (x - 1)); start = -1; }
  }
  console.log(y + ': ' + runs.join(' '));
}
console.log('exit trigger', JSON.stringify(T.state.level.exit));
