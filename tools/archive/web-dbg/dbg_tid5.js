'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
const G = window.GAME_ASSETS;
const t = G.gfx['0'].terrains['5'];
const d = Buffer.from(t.d, 'base64');
for (let y = 0; y < t.h; y++) {
  let r = String(y).padStart(3) + ' ';
  for (let x = 0; x < t.w; x++) {
    const b = d[y * ((t.w + 1) >> 1) + (x >> 1)];
    const v = (x & 1) ? b & 15 : b >> 4;
    r += v ? '#' : '.';
  }
  console.log(r);
}