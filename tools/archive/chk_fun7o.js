const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
let b1 = false, b2 = false;
const prevBricks = [];
const LIM = 9000;
for (let t = 0; t < LIM && !T.state.over; t++) {
  T.stepSim(L);
  const lems = T.state.lems;
  if (!b1 && L.skills[4] > 0) {
    const cand = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const pick = cand.sort((a, b) => b.x - a.x)[0];
    if (pick && pick.dir > 0 && Math.round(pick.x + 12) >= 694 && Math.round(pick.x + 12) <= 702) {
      if (T.assignSkill(L, pick, 4)) { b1 = true; console.log('b1 assigned t=' + t + ' x=' + pick.x.toFixed(1)); }
    }
  }
  if (b1 && !b2 && L.skills[4] > 0) {
    const cand = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const pick = cand.sort((a, b) => b.x - a.x)[0];
    if (pick && pick.dir > 0 && pick.x > 940 && pick.x < 960) {
      if (T.assignSkill(L, pick, 4)) { b2 = true; console.log('b2 assigned t=' + t + ' x=' + pick.x.toFixed(1) + ' y=' + pick.y.toFixed(1)); }
    }
  }
  if (t % 200 === 0) {
    const alive = lems.filter(l => !l.dead && !l.rescued);
    const head = alive.length ? alive.sort((a, b) => b.x - a.x)[0] : null;
    const bs = [];
    for (const l of lems) if (l.state === 'build' || l.state === 'shrug') bs.push('B' + (l === null ? '' : '') + l.x.toFixed(0) + '/' + l.y.toFixed(0));
    console.log('t' + t + ' head ' + (head ? head.x.toFixed(1) + ',' + head.y.toFixed(1) + head.dir > 0 ? '>' : '<' + ' ' + head.state : '-') + ' builders: ' + (bs.join(' ') || 'none'));
  }
}