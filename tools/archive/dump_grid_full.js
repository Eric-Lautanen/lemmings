'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
let out = '';
for (let y = 0; y < 160; y++) {
  let s = `y=${String(y).padStart(3)}: `;
  let start = -1;
  for (let x = 380; x < 960; x++) {
    if (L.solid[y * 1600 + x]) { if (start < 0) start = x; }
    else if (start >= 0) { s += start + '-' + (x - 1) + '  '; start = -1; }
  }
  if (start >= 0) s += start + '-959';
  out += s + '\n';
}
fs.writeFileSync('C:/Users/ericl/AppData/Local/Temp/opencode/lvl2_grid.txt', out);
console.log('ok');