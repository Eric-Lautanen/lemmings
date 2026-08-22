const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
function findGround(L, x, gy) {
  var r = 0;
  if (solidAt(L, x, gy)) {
    while (solidAt(L, x, gy + r - 1) && r > -10) r--;
  } else {
    r = 1;
    while (!solidAt(L, x, gy + r) && r < 4) r++;
  }
  return r;
}
function wallAhead(lem) {
  var fx = lem.dir > 0 ? Math.round(lem.x + 12) : Math.round(lem.x - 1);
  return findGround(L, fx, Math.round(lem.y) + 1) < -6;
}
let builds = 0;
for (let t = 0; t < 20000 && !T.state.over; t++) {
  T.stepSim(L);
  const anyBuild = T.state.lems.some(l => l.state === 'build');
  if (!anyBuild && L.skills[4] > 0) {
    const cand = T.state.lems.filter(l => !l.dead && !l.rescued && l.state === 'walk' && wallAhead(l));
    if (cand.length) {
      const pick = cand.sort((a, b) => b.x - a.x)[0];
      if (T.assignSkill(L, pick, 4)) builds++;
    }
  }
  if (t % 4000 === 0 && t > 0) {
    const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
    console.log('t' + t, 'rescued', T.state.rescued, 'alive', alive.length,
      'maxX', alive.length ? Math.max(...alive.map(l => l.x)) : '-', 'builds', builds);
  }
}
console.log('over:', T.state.over, 'rescued:', T.state.rescued, 'builds:', builds);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('alive:', alive.length, 'max x:', alive.length ? Math.max(...alive.map(l => l.x)) : '-');