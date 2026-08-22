// Sweep: which builder start-x positions clear the Fun7 wall?
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;

for (let x0 = 688; x0 <= 716; x0 += 2) {
  T.resetLevel(6);
  const L = () => T.state.level;
  let b = null;
  for (let t = 0; t < 3000 && !b; t++) {
    T.stepSim(L());
    b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk' && l.dir > 0);
  }
  b.x = x0; b.y = 127; b.dir = 1;
  if (!T.assignSkill(L(), b, 4)) { console.log(`x0=${x0}: assign failed`); continue; }
  let crossed = false, endState = '';
  for (let t = 0; t < 1200; t++) {
    T.stepSim(L());
    if (Math.round(b.x) >= 724 && Math.round(b.y) <= 116) { crossed = true; break; }
    if (b.dead) break;
  }
  console.log(`x0=${x0}: crossed=${crossed} final ${b.state} ${Math.round(b.x)},${Math.round(b.y)} bricks=${b.bricksLeft}`);
}
