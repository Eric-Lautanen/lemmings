'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'));
const T = window._lemTest;
const L = T.loadLevel(-1, { section: 0, name: 'x', rate: 50, lems: 10, rescue: 1, time: 5, skills: [0, 0, 0, 0, 0, 0, 0, 0] });

const X0 = 380, X1 = 1180, SC = 2; // 2px columns
const yTop = 40, yBot = 160;
for (let y = yTop; y < yBot; y += 4) {
  let row = String(y).padStart(4) + ' ';
  for (let x = X0; x < X1; x += SC) {
    let s = 0;
    for (let dy = 0; dy < 4 && !s; dy++) for (let dx = 0; dx < SC && !s; dx++) {
      if (L.solid[(y + dy) * L.W + x + dx]) s = 1;
    }
    // door boxes overlay
    let door = false;
    for (const o of L.objs) {
      if (o.dw > 0 && o.dh > 0 && x >= o.dx && x < o.dx + o.dw && y >= o.dy && y < o.dy + o.dh) { door = true; break; }
    }
    row += door ? 'D' : (s ? '#' : '.');
  }
  console.log(row);
}
for (const o of L.objs) {
  console.log('obj id', o.id, 'img', o.dx, o.dy, o.dw + 'x' + o.dh, 'trig', o.x, o.y, o.w + 'x' + o.h, 'eff', o.effect);
}
