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
b.x = 682; b.y = 127; b.dir = 1;
T.assignSkill(L(), b, 4);
const sol = (x, y) => x < 0 || y < 0 || x >= L().W || y >= L().H ? 0 : L().solid[y * L().W + x];
for (let t = 0; t < 20; t++) {
  const pre = `t=${t} st=${b.state} x=${Math.round(b.x)} y=${Math.round(b.y)} bc=${(b.tick - b.stT + 1) % 16}`;
  T.stepSim(L());
  console.log(pre, '->', `st=${b.state} x=${Math.round(b.x)} y=${Math.round(b.y)}`,
    '| checks: a=', sol(Math.round(b.x), Math.round(b.y) - 1),
    'b=', sol(Math.round(b.x) + b.dir * 2, Math.round(b.y) - 9),
    'brickrow126@683..688=', [683, 684, 685, 686, 687, 688].map(x => sol(x, 126)).join(''),
    'row125=', [683, 684, 685, 686, 687, 688].map(x => sol(x, 125)).join(''));
}
