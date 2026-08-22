// Trace builder from x=700 with new physics
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
for (let t = 0; t < 400; t++) {
  T.stepSim(L());
  if (t % 16 === 0 || b.state !== 'build') {
    console.log(`t=${t} ${b.state} x=${Math.round(b.x)} y=${Math.round(b.y)} bricks=${b.bricksLeft} ` +
      `feetSolid=${sol(Math.round(b.x), Math.round(b.y) + 1)} aheadWall=${sol(Math.round(b.x) + b.dir, Math.round(b.y))}`);
  }
  if (b.state !== 'build' && t > 20) break;
}
