// Trace the wall builder's fate and subsequent lem flow
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
let assigned = null, t0 = -1;
for (let t = 0; t < 6000; t++) {
  T.stepSim(L());
  if (!assigned && t > 200) {
    for (const l of T.state.lems) {
      if (l.dead || l.rescued || l.state !== 'walk' || l.dir <= 0) continue;
      const x = Math.round(l.x), y = Math.round(l.y);
      if (x >= 696 && x <= 716 && y >= 125) {
        if (T.assignSkill(L(), l, 4)) { assigned = l; t0 = t; console.log(`assigned at ${x},${y} t=${t}`); }
        break;
      }
    }
  } else if (assigned) {
    if (t % 40 === 0 || assigned.state === 'walk' || assigned.dead) {
      console.log(`t=${t} builder: ${assigned.state} x=${Math.round(assigned.x)} y=${Math.round(assigned.y)} bricks=${assigned.bricksLeft} dead=${assigned.dead}`);
    }
    if ((assigned.state === 'walk' && t > t0 + 20) || assigned.dead) break;
  }
}
// then watch overall population distribution
for (let t = 0; t < 3000; t++) {
  T.stepSim(L());
  if (t % 500 === 0) {
    const zones = {};
    for (const l of T.state.lems) {
      if (l.dead || l.rescued) continue;
      const k = `${Math.round(l.x / 50) * 50},${Math.round(l.y)}`;
      zones[k] = (zones[k] || 0) + 1;
    }
    console.log('t=', t, JSON.stringify(zones));
  }
}
