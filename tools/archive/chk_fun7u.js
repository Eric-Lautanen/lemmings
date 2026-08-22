'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const W = 1600;
function solidAt(x, y) { return y >= 0 && y < 400 && x >= 0 && x < W && L.solid[y * W + x] === 1; }
function findGround(x, gy) {
  var r = 0;
  if (solidAt(x, gy)) { while (solidAt(x, gy + r - 1) && r > -10) r--; }
  else { r = 1; while (!solidAt(x, gy + r) && r < 4) r++; }
  return r;
}
function assignBuilder(xmin, xmax, ymin, ymax) {
  for (const lem of T.state.lems) {
    if (lem.dead || lem.rescued || lem.state !== 'walk' || lem.dir <= 0) continue;
    const x = Math.round(lem.x), y = Math.round(lem.y);
    if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) { T.assignSkill(L, lem, 4); return true; }
  }
  return false;
}
let b1 = false, b2 = false, b3 = false, watched = null;
for (let t = 0; t < 6000 && !T.state.over; t++) {
  T.stepSim(L);
  if (!b1) b1 = assignBuilder(658, 668, 88, 99);
  else if (!b2) b2 = assignBuilder(855, 872, 62, 70);
  else if (!b3) b3 = assignBuilder(945, 962, 50, 58);
  for (const lem of T.state.lems) {
    if (lem.dead || lem.rescued) continue;
    const x = Math.round(lem.x), y = Math.round(lem.y);
    if (!watched && x >= 900 && y >= 90 && lem.state === 'walk' && lem.dir > 0) watched = lem;
    if (watched === lem && x >= 930 && x <= 985 && (y > 70 || lem.state !== 'fall')) {
      const fx = x + (lem.dir > 0 ? 11 : 0), gy = y + 1;
      const dy = findGround(fx, gy), sdy = findGround(x, y + 1);
      console.log('t' + t + ' lem ' + x + ',' + y + '/' + lem.state + '/' + lem.dir + ' nose(' + fx + ',' + gy + ')dy=' + dy + ' own sdy=' + sdy
        + ' pillarbase=' + solidAt(974, 96) + ' floor961=' + solidAt(961, 96) + ' floor973=' + solidAt(973, 96));
      if (y > 70 && x >= 955) { console.log('=== REACHED RIGHT ZONE ==='); }
      if (x > 985 || y > 110) watched = null;
    }
  }
  if (T.state.rescued > 0) break;
}