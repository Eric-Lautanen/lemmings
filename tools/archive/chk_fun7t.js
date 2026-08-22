'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;

function assignBuilder(xmin, xmax, ymin, ymax) {
  for (const lem of T.state.lems) {
    if (lem.dead || lem.rescued || lem.state !== 'walk' || lem.dir <= 0) continue;
    const x = Math.round(lem.x), y = Math.round(lem.y);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) { T.assignSkill(L, lem, 4); return true; }
  }
  return false;
}

let b1 = false, b2 = false;
for (let t = 0; t < 6000 && !T.state.over; t++) {
  T.stepSim(L);
  if (!b1) b1 = assignBuilder(658, 668, 88, 99);
  else if (!b2) b2 = assignBuilder(855, 872, 62, 70);
  if (t % 25 === 0 && t >= 800 && t <= 1500) {
    const sorted = T.state.lems.filter(l => !l.dead && !l.rescued).sort((a, b) => a.x - b.x);
    const lead = sorted.slice(-4).map(l => Math.round(l.x) + ',' + Math.round(l.y) + '/' + l.state + '/' + l.dir).join('  ');
    console.log('t' + t + ' ' + lead);
    if (t === 1500) break;
  }
}
console.log('builders b1=' + b1 + ' b2=' + b2 + ' rescued=' + T.state.rescued);