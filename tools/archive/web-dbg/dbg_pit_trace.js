// Trace pit builder
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
let b = null;
for (let t = 0; t < 6000 && !b; t++) {
  T.stepSim(L());
  b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk' && l.dir > 0 &&
    Math.round(l.x) >= 950 && Math.round(l.x) <= 970 && Math.round(l.y) >= 94);
}
if (!b) { console.log('no plateau walker found'); process.exit(1); }
console.log(`pit builder at ${Math.round(b.x)},${Math.round(b.y)}`);
T.assignSkill(L(), b, 4);
for (let t = 0; t < 500; t++) {
  T.stepSim(L());
  if (t % 16 === 0 || b.state !== 'build') {
    console.log(`t=${t} ${b.state} x=${Math.round(b.x)} y=${Math.round(b.y)} bricks=${b.bricksLeft}`);
  }
  if (b.state !== 'build' && t > 20) break;
}
