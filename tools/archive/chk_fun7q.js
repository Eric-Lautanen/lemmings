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
let b1 = false;
const LIM = 700;
for (let t = 0; t < LIM && !T.state.over; t++) {
  T.stepSim(L);
  const lems = T.state.lems;
  if (!b1 && L.skills[4] > 0) {
    const cand = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const pick = cand.sort((a, b) => b.x - a.x)[0];
    if (pick && pick.dir > 0 && Math.round(pick.x + 12) >= 694 && Math.round(pick.x + 12) <= 702) {
      if (T.assignSkill(L, pick, 4)) { b1 = true; }
    }
  }
  for (let i = 0; i < Math.min(lems.length, 12); i++) {
    const l = lems[i];
    if (l.dead || l.rescued || l.state === 'build') continue;
    if (l.x > 688 && l.x < 742 && (l.y < 96 || l.state === 'fall')) {
      const sdy = findGround(L, Math.round(l.x), Math.round(l.y) + 1);
      if (t % 8 === 0)
        console.log('t' + t + ' lem' + i + ' x=' + l.x.toFixed(1) + ' y=' + l.y.toFixed(1) + ' ' + l.state + ' own' + sdy);
      break;
    }
  }
}