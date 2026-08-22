'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
console.log('spawn', L.spawnX, L.spawnY);
for (let t = 0; t < 900; t++) {
  T.stepSim(L);
  const l0 = T.state.lems[0];
  if (t % 20 === 0 && l0) {
    console.log('t', t, 'x', l0.x.toFixed(1), 'y', l0.y.toFixed(1), 'state', l0.state, 'dir', l0.dir, 'vy', l0.vy.toFixed(1));
  }
}
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('lems released', T.state.released, 'alive', alive.length, 'dead', T.state.lems.length - alive.length, 'rescued', T.state.rescued);
console.log('positions:', alive.slice(0, 8).map(l => l.state + '@' + Math.round(l.x) + ',' + Math.round(l.y) + (l.dir > 0 ? '>' : '<')).join('  '));
