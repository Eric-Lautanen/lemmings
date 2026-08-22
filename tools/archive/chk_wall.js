const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
for (let x = 690; x <= 730; x += 2) {
  let cols = [];
  for (let y = 70; y <= 120; y++) if (L.solid[y * L.W + x]) cols.push(y);
  console.log('x=' + x, cols.length ? 'solid@y' + cols.join(',') : 'empty');
}