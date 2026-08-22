'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
const W = L.W, H = L.H;
const STORE = {};
for (let lx = 0; lx < W; lx++) {
  for (let ly = 0; ly < H; ly++) {
    if (L.solid[ly * W + lx]) {
      const k = (ly >> 3);
      if (!STORE[k]) STORE[k] = [];
      STORE[k].push(lx);
    }
  }
}
// ruler: every 10 eigth-cols (80 px)
const ruler = '         1         2         3         4         5         6         7         8         9         0         ';
const tick = '00000000001111111111222222222233333333334444444444555555555566666666667777777777888888888899999999990000000000';
console.log('   ' + ruler.slice(0, 200));
console.log('   ' + tick.slice(0, 200));
for (const k of Object.keys(STORE).sort((a, b) => a - b)) {
  const ly = k * 8;
  let line = '';
  for (let col = 0; col < 200; col++) {
    const lx0 = col * 8;
    line += STORE[k].some(x => x >= lx0 && x < lx0 + 8) ? '#' : '.';
  }
  console.log('%3d %s', ly, line);
}