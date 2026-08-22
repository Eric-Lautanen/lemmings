const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

T.resetLevel(7);
const Lc = T.state.level;
let nudged = false;
for (let t = 0; t < 200; t++) {
  T.stepSim(Lc);
  const lem0 = T.state.lems[0];
  if (!lem0) continue;
  if (lem0.dead) { console.log('t' + t, 'dead'); break; }
  if (!nudged && lem0.state === 'walk') { lem0.dir = -1; lem0.climber = 1; nudged = true; }
  if (lem0.x < 592) {
    // dump around the wall approach
    const fx = lem0.dir > 0 ? Math.round(lem0.x) + 11 : Math.round(lem0.x) + 0;
    let dy = 0, r = 0;
    if (Lc.solid[Math.round(lem0.y + 1) * Lc.W + fx]) {
      r = 0; while (Lc.solid[(Math.round(lem0.y) + 1 + r - 1) * Lc.W + fx] && r > -10) r--;
      dy = r;
    }
    console.log('t' + t, lem0.state, 'x', Math.round(lem0.x), 'y', Math.round(lem0.y), 'dir', lem0.dir, 'front', fx, 'dy', dy, 'climber', lem0.climber);
  }
}