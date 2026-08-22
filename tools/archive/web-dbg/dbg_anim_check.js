// Verify: walk frames advance on flat + steps; builder stair geometry; followers climb
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;

// --- 1. walk frame cycling ---
T.resetLevel(0); // Fun 1, flat pocket walkers
const seen = new Set();
for (let t = 0; t < 120; t++) {
  T.stepSim(T.state.level);
  const w = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk');
  if (w) seen.add(w.frame % 8);
}
console.log('walk frames seen (want ~all 8):', [...seen].sort((a, b) => a - b).join(','));

// --- 2. builder stair geometry ---
T.resetLevel(7);
const L = () => T.state.level;
let b = null;
for (let t = 0; t < 3000 && !b; t++) { T.stepSim(L()); b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk'); }
b.x = 600; b.y = 100; b.dir = 1;
const sol = (x, y) => sol0(L(), x, y);
function sol0(Lv, x, y) { return x < 0 || y < 0 || x >= Lv.W || y >= Lv.H ? 0 : Lv.solid[y * Lv.W + x]; }
T.assignSkill(L(), b, 4);
for (let t = 0; t < 220; t++) T.stepSim(L());
// ASCII around the built stair
console.log('builder ended at', Math.round(b.x) + ',' + Math.round(b.y), 'state', b.state);
const x0 = 590, x1 = 650, yTop = Math.round(b.y) - 4, yBot = Math.min(159, Math.round(b.y) + 14);
for (let y = yTop; y <= yBot; y++) {
  let row = '';
  for (let x = x0; x < x1; x++) row += sol(x, y) ? '#' : '.';
  console.log(String(y).padStart(3), row);
}

// --- 3. follower climbs the stair: teleport a walker at the stair base ---
const f = T.state.lems.find(l => l !== b && !l.dead && !l.rescued && l.state === 'walk' && l.dir < 0);
if (f) {
  f.dir = 1;
  f.x = b.x - 30; f.y = Math.round(b.y) + 10;
  // drop onto ground first
  while (!sol(Math.round(f.x), Math.round(f.y) + 1) && f.y < 159) f.y++;
  let climbed = false;
  for (let t = 0; t < 400; t++) {
    T.stepSim(L());
    if (f.state !== 'walk') break;
    if (Math.round(f.y) <= Math.round(b.y)) { climbed = true; break; }
  }
  console.log('follower reached stair top height:', climbed, 'at', Math.round(f.x) + ',' + Math.round(f.y));
}
