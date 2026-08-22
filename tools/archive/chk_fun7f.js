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
const LIM = 3200;
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
  if (t >= 2400) {
    const alive = lems.filter(l => !l.dead && !l.rescued);
    const head = alive.sort((a, b) => b.x - a.x)[0];
    if (head && head.x > 780) {
      const fx = head.dir > 0 ? Math.round(head.x + 11) : Math.round(head.x - 1);
      const gy = Math.round(head.y) + 1;
      const dy = findGround(L, fx, gy);
      const sdy = findGround(L, Math.round(head.x), gy);
      console.log(t + ' ' + head.x.toFixed(1) + ',' + head.y.toFixed(1) + (head.dir > 0 ? '>' : '<') +
        ' ' + head.state + ' nose(' + fx + ',' + gy + ')' + dy + ' own' + sdy + ' headN ' + head.tick);
    }
  }
}