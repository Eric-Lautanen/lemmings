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

let b1 = false, b2 = false, b3 = false, maxX = 0;
for (let t = 0; t < 6000 && !T.state.over; t++) {
  T.stepSim(L);
  if (!b1) b1 = assignBuilder(658, 668, 88, 99);
  else if (!b2) b2 = assignBuilder(855, 872, 62, 70);
  else if (!b3) b3 = assignBuilder(935, 950, 50, 60);
  for (const lem of T.state.lems) if (!lem.dead && !lem.rescued) maxX = Math.max(maxX, Math.round(lem.x));
  if (t % 400 === 0) {
    const sorted = T.state.lems.filter(l => !l.dead && !l.rescued).sort((a, b) => a.x - b.x);
    const head = sorted[sorted.length - 1];
    console.log('t' + t + ' head=' + (head ? Math.round(head.x) + ',' + Math.round(head.y) + '/' + head.state + '/' + head.dir : '-')
      + ' alive=' + sorted.length + ' rescued=' + T.state.rescued + ' maxX=' + maxX);
  }
}
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('END over=' + T.state.over + ' builders=' + [b1, b2, b3].filter(Boolean).length + ' rescued=' + T.state.rescued + ' maxX=' + maxX + ' alive=' + alive.length);
for (const lem of alive) console.log('  alive: ' + Math.round(lem.x) + ',' + Math.round(lem.y) + ' ' + lem.state + ' dir=' + lem.dir);