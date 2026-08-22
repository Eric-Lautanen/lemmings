'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

T.resetLevel(2);
const L = T.state.level;
const last = new Map();
for (let t = 0; t < 6000; t++) {
  T.stepSim(L);
  for (let i = 0; i < T.state.lems.length; i++) {
    const lem = T.state.lems[i];
    if (lem.dead || lem.rescued) continue;
    const x = Math.round(lem.x), y = Math.round(lem.y);
    if (y < 40 || x < 440 || x > 580) continue;
    const s = lem.state + (lem.dir < 0 ? 'L' : 'R');
    const key = x + ',' + y + ',' + s;
    const prev = last.get(i);
    if (prev !== key) {
      console.log('t' + t + ' lem#' + i + ' @' + x + ',' + y + ' ' + s);
      last.set(i, key);
    }
  }
}
console.log('final over=' + T.state.over + ' rescued=' + T.state.rescued);
for (let i = 0; i < T.state.lems.length; i++) {
  const lem = T.state.lems[i];
  console.log(' lem#' + i + ' dead=' + lem.dead + ' rescued=' + lem.rescued + ' state=' + lem.state +
    ' @' + Math.round(lem.x) + ',' + Math.round(lem.y) + ' dir=' + lem.dir);
}
