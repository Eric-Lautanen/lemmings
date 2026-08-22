'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
// render 1 char per 2x2 block over x 400-960, y 0-160
const x0 = 400, x1 = 960, SC = 2;
const chars = ' .:-=+*#%@';
let out = '';
for (let y = 0; y < 160; y += SC) {
  let line = '';
  for (let x = x0; x < x1; x += SC) {
    let c = 0;
    for (let dy = 0; dy < SC && y + dy < 160; dy++)
      for (let dx = 0; dx < SC && x + dx < x1; dx++)
        if (L.solid[(y + dy) * 1600 + (x + dx)]) c++;
    line += chars[c];
  }
  out += line + '\n';
}
console.log(out);
