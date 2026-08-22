// Probe 3: proper Fun7 route - build early before the wall and before the pit
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
let phase = 1, used = 0;
for (let t = 0; t < 30000 && !T.state.over; t++) {
  T.stepSim(L());
  if (T.state.pending === 0 || t > 2000) {
    for (const l of T.state.lems) {
      if (l.dead || l.rescued || l.state !== 'walk' || l.dir <= 0) continue;
      const x = Math.round(l.x), y = Math.round(l.y);
      if (phase === 1 && x >= 694 && x <= 710 && y >= 125) {
        if (T.assignSkill(L(), l, 4)) { used++; phase = 2; console.log(`t=${t} wall builder at ${x},${y}`); }
      } else if (phase === 2 && x >= 964 && x <= 971 && y >= 94 && y <= 97) {
        if (T.assignSkill(L(), l, 4)) { used++; phase = 3; console.log(`t=${t} pit builder at ${x},${y}`); }
      } else if (phase === 3 && x >= 992 && x <= 1010 && y >= 94 && y <= 97 && T.state.lems.indexOf(l) % 7 === 0) {
        // spare builders: bridge again behind the lead lem so more follow
        if (T.assignSkill(L(), l, 4)) { used++; }
      }
    }
  }
}
console.log('end:', T.state.over, 'rescued=', T.state.rescued, '/', L().rescueNeed,
  'builders=', used, 'left=', L().skills[4]);
