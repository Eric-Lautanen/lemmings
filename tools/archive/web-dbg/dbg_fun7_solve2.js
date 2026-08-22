// Probe 2: efficient chain-building - assign a builder right when a walker turns at a wall
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
const lastDir = new Map();
let buildersUsed = 0, phase = 1;
for (let t = 0; t < 40000 && !T.state.over; t++) {
  T.stepSim(L());
  for (const l of T.state.lems) {
    if (l.dead || l.rescued || l.state !== 'walk') { lastDir.set(l, l.dir); continue; }
    const prev = lastDir.get(l);
    lastDir.set(l, l.dir);
    if (prev === undefined || prev === l.dir) continue;
    // just turned at a wall
    const x = Math.round(l.x), y = Math.round(l.y);
    if (l.dir < 0 && phase === 1 && x > 640 && x < 725 && y > 110) {
      l.dir = 1;                       // face back into the wall
      if (T.assignSkill(L(), l, 4)) buildersUsed++;
    } else if (phase === 2 && ((l.dir < 0 && x > 900 && x < 978 && y < 120) || (l.dir > 0 && x > 985 && x < 1010 && y < 120))) {
      if (x > 900 && x < 978) l.dir = 1;
      else l.dir = -1;
      if (T.assignSkill(L(), l, 4)) buildersUsed++;
    }
  }
  if (phase === 1) {
    const top = T.state.lems.find(l => !l.dead && !l.rescued && Math.round(l.x) >= 730 && Math.round(l.y) <= 117);
    if (top) { phase = 2; console.log(`t=${t} reached mesa top at ${Math.round(top.x)},${Math.round(top.y)} builders=${buildersUsed}`); }
  } else if (phase === 2) {
    const top = T.state.lems.find(l => !l.dead && !l.rescued && Math.round(l.x) >= 992 && Math.round(l.y) <= 96);
    if (top) { phase = 3; console.log(`t=${t} reached right plateau at ${Math.round(top.x)},${Math.round(top.y)} builders=${buildersUsed}`); }
  }
}
console.log('end:', T.state.over, 'rescued=', T.state.rescued, '/', L().rescueNeed,
  'builders used=', buildersUsed, 'skills left=', L().skills[4], 'phase=', phase);
