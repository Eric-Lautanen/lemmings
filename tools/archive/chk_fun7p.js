const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
let b1 = false, trace = false;
const LIM = 1200;
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
  const alive = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
  const head = alive.sort((a, b) => b.x - a.x)[0];
  if (head && head.x > 685 && !trace) { trace = true; console.log('tracing from t=' + t); }
  if (trace && t < 1100) {
    if (t % 30 === 0) console.log('t' + t + ' head x=' + head.x.toFixed(1) + ' y=' + head.y.toFixed(1));
  }
}
console.log('final ramp bricks:');
let found = 0;
for (let y = 70; y <= 97; y++) {
  let row = '';
  for (let x = 680; x <= 730; x++) row += solidAt(L, x, y) ? '#' : '.';
  if (row.includes('#')) { console.log(String(y).padStart(2) + ' ' + row); found++; if (found > 30) break; }
}