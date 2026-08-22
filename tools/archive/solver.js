'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

function run(lvl, checkpoints) {
  T.resetLevel(lvl);
  const L = T.state.level;
  const done = new Set();
  for (let t = 0; t < 6000 && !T.state.over; t++) {
    T.stepSim(L);
    for (let c = 0; c < checkpoints.length; c++) {
      const chk = checkpoints[c];
      if (done.has(c)) continue;
      if (chk.cond(L)) {
        const lem = chk.pick(L);
        if (lem && T.assignSkill(L, lem, chk.skill)) {
          done.add(c);
          console.log('t' + t + ' lvl' + lvl + ' assigned ' + chk.name + ' to lem at ' + Math.round(lem.x) + ',' + Math.round(lem.y));
        }
      }
    }
    if (T.state.over) break;
  }
  const alive = T.state.lems.filter(l => !l.dead && !l.rescued).length;
  console.log('RESULT lvl' + lvl + ' over=' + T.state.over + ' rescued=' + T.state.rescued + ' alive=' + alive
    + ' skills used=' + Array.from(done).join(','));
  return T.state.over === 'win';
}

// ---- level 0: Just dig! ----
function firstWalker(xmin, xmax, ymin, ymax) {
  return function (L) {
    for (const lem of T.state.lems) {
      if (lem.dead || lem.rescued || lem.state !== 'walk' || lem.dir <= 0) continue;
      const x = Math.round(lem.x), y = Math.round(lem.y);
      if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) return lem;
    }
    return null;
  };
}
run(0, [
  { name: 'dig1', skill: 7, cond: L => true, pick: firstWalker(740, 806, 64, 86) }
]);
run(1, [
  { name: 'float1', skill: 1, cond: L => true, pick: firstWalker(600, 668, 58, 82) }
]);