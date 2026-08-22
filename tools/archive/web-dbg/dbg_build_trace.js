const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
// wait for a walker, teleport it 40px left of the wall facing right, make it build
let b = null;
for (let t = 0; t < 3000 && !b; t++) {
  T.stepSim(L());
  b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk' && l.dir > 0);
}
b.x = 682; b.y = 127; b.dir = 1;
T.assignSkill(L(), b, 4);
for (let t = 0; t < 500; t++) {
  T.stepSim(L());
  if (t % 4 === 0 || b.state !== 'build') {
    console.log(`t=${t} state=${b.state} x=${Math.round(b.x)} y=${Math.round(b.y)} bricks=${b.bricksLeft} dir=${b.dir}`);
  }
  if (b.state !== 'build') break;
}
