'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

function run(w1, w2, w3) {
  T.resetLevel(6);
  const L = T.state.level;
  const a = (xmin, xmax, ymin, ymax) => {
    for (const lem of T.state.lems) {
      if (lem.dead || lem.rescued || lem.state !== 'walk' || lem.dir <= 0) continue;
      const x = Math.round(lem.x), y = Math.round(lem.y);
      if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) return T.assignSkill(L, lem, 4);
    }
    return false;
  };
  let b1 = false, b2 = false, b3 = false, winT = -1;
  for (let t = 0; t < 3000 && !T.state.over; t++) {
    T.stepSim(L);
    if (!b1) b1 = a(w1[0], w1[1], w1[2], w1[3]);
    else if (!b2) b2 = a(w2[0], w2[1], w2[2], w2[3]);
    else if (!b3) b3 = a(w3[0], w3[1], w3[2], w3[3]);
    if (T.state.over === 'win' && winT < 0) winT = t;
  }
  return { over: T.state.over, rescued: T.state.rescued, winT };
}

const base = run([658, 668, 88, 99], [855, 872, 62, 70], [935, 950, 50, 60]);
const shift = run([655, 675, 88, 99], [850, 875, 62, 70], [930, 955, 50, 60]);
const late = run([658, 668, 88, 99], [850, 860, 60, 70], [940, 950, 50, 60]);
console.log('base :', JSON.stringify(base));
console.log('shift:', JSON.stringify(shift));
console.log('late :', JSON.stringify(late));