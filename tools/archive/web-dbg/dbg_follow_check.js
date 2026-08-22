// Follower climbs builder stairs?
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(7);
const L = () => T.state.level;
const sol = (x, y) => x < 0 || y < 0 || x >= L().W || y >= L().H ? 0 : L().solid[y * L().W + x];

let b = null;
for (let t = 0; t < 3000 && !b; t++) { T.stepSim(L()); b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk'); }
b.x = 600; b.y = 100; b.dir = 1;
T.assignSkill(L(), b, 4);
for (let t = 0; t < 220; t++) T.stepSim(L());

// spawn-check: use a second lem still walking somewhere
const cands = T.state.lems.filter(l => l !== b && !l.dead && !l.rescued);
console.log('other live lems:', cands.length);
const f = cands[0];
f.dir = 1;
f.x = b.x - 34;
f.y = Math.round(b.y);   // same height as the builder started (on flat ground)
console.log('follower dropped at', Math.round(f.x) + ',' + Math.round(f.y));
let reached = false, turned = false;
for (let t = 0; t < 400; t++) {
  T.stepSim(L());
  if (f.dead) break;
  if (f.state === 'walk' && f.dir < 0) { turned = true; break; }
  if (Math.round(f.x) >= Math.round(b.x) && Math.round(f.y) <= Math.round(b.y)) { reached = true; break; }
}
console.log('reached stair top:', reached, 'turned:', turned, 'final', f.state, Math.round(f.x) + ',' + Math.round(f.y));
