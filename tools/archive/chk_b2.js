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
  if (solidAt(L, x, gy)) { while (solidAt(L, x, gy + r - 1) && r > -10) r--; }
  else { r = 1; while (!solidAt(L, x, gy + r) && r < 4) r++; }
  return r;
}
function wallAhead(lem) {
  var fx = lem.dir > 0 ? Math.round(lem.x + 12) : Math.round(lem.x - 1);
  return findGround(L, fx, Math.round(lem.y) + 1) < -6;
}
let assigned = false;
let lastX = 0;
for (let t = 0; t < 3000 && !T.state.over; t++) {
  T.stepSim(L);
  if (!assigned && L.skills[4] > 0) {
    const cand = T.state.lems.filter(l => !l.dead && !l.rescued && l.state === 'walk' && wallAhead(l));
    if (cand.length) { T.assignSkill(L, cand.sort((a, b) => b.x - a.x)[0], 4); assigned = true; console.log('assigned builder at t' + t); }
  }
  const b = T.state.lems.find(l => l.state === 'build' || l.state === 'shrug');
  if (b && t % 6 === 0) console.log('t' + t, 'b:' + b.state + '@' + Math.round(b.x) + ',' + Math.round(b.y));
  const maxx = Math.max(...T.state.lems.filter(l => !l.dead && !l.rescued).map(l => l.x));
  if (maxx > lastX + 20) { lastX = maxx; console.log('t' + t, 'maxx now', maxx); }
}
console.log('done. rescued', T.state.rescued, 'maxx', Math.max(...T.state.lems.filter(l => !l.dead).map(l => l.x)));