const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
let assigned = 0, builds = 0;
for (let t = 0; t < 7000 && !T.state.over; t++) {
  T.stepSim(L);
  const lems = T.state.lems;
  if (assigned < 1 && L.skills[4] > 0) {
    const cand = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const pick = cand.sort((a, b) => b.x - a.x)[0];
    if (pick && pick.dir > 0 && Math.round(pick.x + 12) >= 694 && Math.round(pick.x + 12) <= 702) {
      if (T.assignSkill(L, pick, 4)) { assigned++; builds++; console.log('assigned builder at x=' + pick.x.toFixed(1) + ' t=' + t); }
    }
  }
  if (t % 200 === 0) {
    const alive = lems.filter(l => !l.dead && !l.rescued);
    const head = alive.sort((a, b) => b.x - a.x)[0];
    const states = {};
    for (const l of alive) states[l.state] = (states[l.state] || 0) + 1;
    console.log('t' + t, 'rescued', T.state.rescued, 'head', head ? head.x.toFixed(1) + ',' + head.y.toFixed(1) + ',' + head.state : '-',
      'maxX', alive.length ? Math.max(...alive.map(l => l.x)) : '-', JSON.stringify(states));
  }
}
console.log('over:', T.state.over, 'rescued:', T.state.rescued, 'builds:', builds);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('alive:', alive.length);
console.log(alive.map(l => l.x.toFixed(0) + '@' + l.y.toFixed(0) + '/' + l.state).sort().join(' '));