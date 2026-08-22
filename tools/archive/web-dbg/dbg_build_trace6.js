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
for (let t = 0; t < 3000 && !b; t++) {
  T.stepSim(L());
  b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk' && l.dir > 0);
}
b.x = 700; b.y = 127; b.dir = 1;
T.assignSkill(L(), b, 4);
const sol = (x, y) => x < 0 || y < 0 || x >= L().W || y >= L().H ? 0 : L().solid[y * L().W + x];
let prevTick = b.tick;
for (let t = 0; t < 400; t++) {
  T.stepSim(L());
  if (b.state !== 'build') {
    const d = b.tick - b.stT;
    console.log(`TURNED at diff=${d} bc=${d % 16} pos=${Math.round(b.x)},${Math.round(b.y)} dir=${b.dir} bricks=${b.bricksLeft}`);
    // reproduce checks for the pre-turn position
    break;
  }
}
