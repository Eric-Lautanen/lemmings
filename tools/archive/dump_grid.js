'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
const solid = (x, y) => (x >= 0 && x < 1600 && y >= 0 && y < 200) ? L.solid[y * 1600 + x] : 0;
for (let y = 61; y <= 99; y++) {
  let runs = [];
  let i = 0;
  const x0 = 380, x1 = 950;
  for (let x = x0; x <= x1; x++) {
    const c = solid(x, y) ? 1 : 0;
    if (i === 0) { if (c) i = x; }
    else if (!c) { runs.push(i + '-' + (x - 1)); i = 0; }
  }
  if (i) runs.push(i + '-' + x1);
  console.log('y' + y + ': ' + runs.join(','));
}
