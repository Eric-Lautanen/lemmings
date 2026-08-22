const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
// replay the solve3 strategy but log everything near the mesa/pit
let phase = 1;
for (let t = 0; t < 4000; t++) {
  T.stepSim(T.state.level);
  for (const l of T.state.lems) {
    if (l.dead || l.rescued || l.state !== 'walk' || l.dir <= 0) continue;
    const x = Math.round(l.x), y = Math.round(l.y);
    if (phase === 1 && x >= 694 && x <= 710 && y >= 125) {
      if (T.assignSkill(T.state.level, l, 4)) { phase = 2; console.log(`t=${t} wall builder ${x},${y}`); }
    } else if (phase === 2 && x >= 940 && x <= 971 && y >= 90 && y <= 100) {
      console.log(`t=${t} plateau walker at ${x},${y} state=${l.state}`);
      if (T.assignSkill(T.state.level, l, 4)) { console.log(`  -> assigned pit builder`); phase = 3; }
    }
  }
  if (t % 200 === 0) {
    const far = T.state.lems.filter(l => !l.dead && !l.rescued).map(l => `${Math.round(l.x)},${Math.round(l.y)}:${l.state[0]}`);
    console.log(`t=${t} phase=${phase} lems:`, far.slice(0, 10).join(' '));
  }
}
