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
let assigned = 0;
const prevDir = [], prevY = [];
const LIM = 3400;
for (let t = 0; t < LIM && !T.state.over; t++) {
  T.stepSim(L);
  const lems = T.state.lems;
  if (assigned < 1 && L.skills[4] > 0) {
    const cand = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const pick = cand.sort((a, b) => b.x - a.x)[0];
    if (pick && pick.dir > 0 && Math.round(pick.x + 12) >= 694 && Math.round(pick.x + 12) <= 702) {
      if (T.assignSkill(L, pick, 4)) { assigned++; console.log('assigned at t=' + t); }
    }
  }
  for (let i = 0; i < lems.length; i++) {
    const l = lems[i];
    if (l.x <= 780 || l.dead || l.rescued) continue;
    if (prevDir[i] !== undefined && prevDir[i] > 0 && l.dir < 0 && l.state === 'walk') {
      const fx = Math.round(l.x + 11), gy = Math.round(l.y) + 1;
      console.log('TURN t' + t + ' lem ' + i + ' x=' + l.x.toFixed(1) + ' y=' + l.y.toFixed(1) + ' nose(' + fx + ',' + gy + ')' + findGround(L, fx, gy) + ' prevY ' + prevY[i].toFixed(1));
    }
    prevDir[i] = l.dir;
    prevY[i] = l.y;
  }
  if (t % 400 === 0) {
    const alive = lems.filter(l => !l.dead && !l.rescued);
    console.log('t' + t, 'maxX', alive.length ? Math.max(...alive.map(l => l.x)) : '-');
  }
}