// Probe: can chained builders scale Fun7's mesa wall and reach the exit?
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
let lastAssign = -100, phase = 1, buildersUsed = 0;
for (let t = 0; t < 20000 && !T.state.over; t++) {
  T.stepSim(L());
  if (t - lastAssign < 30) continue;
  // pick the right-most walker facing right
  let best = null;
  for (const l of T.state.lems) {
    if (l.dead || l.rescued || l.state !== 'walk' || l.dir <= 0) continue;
    if (!best || l.x > best.x) best = l;
  }
  if (!best) continue;
  const x = Math.round(best.x), y = Math.round(best.y);
  if (phase === 1 && x > 600 && x < 722 && y > 110) {
    if (T.assignSkill(L(), best, 4)) { buildersUsed++; lastAssign = t; }
  } else if (phase === 1 && x >= 722) {
    phase = 2; console.log(`t=${t} a lem reached mesa top at ${x},${y} builders=${buildersUsed}`);
  } else if (phase === 2 && x > 900 && x < 975 && y < 120) {
    if (T.assignSkill(L(), best, 4)) { buildersUsed++; lastAssign = t; }
  } else if (phase === 2 && x >= 990 && y < 100) {
    phase = 3; console.log(`t=${t} a lem reached right plateau at ${x},${y}`);
  }
}
console.log('end:', T.state.over, 'rescued=', T.state.rescued, '/', L().rescueNeed,
  'builders used=', buildersUsed, 'skills left=', L().skills[4]);
