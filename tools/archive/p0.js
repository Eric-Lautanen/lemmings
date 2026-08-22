'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
const W = 1600;
function solid(x, y) { return y >= 0 && y < 400 && x >= 0 && x < W && L.solid[y * W + x] === 1; }
console.log('terrain rows 24-140 at x 700-1000 (spawn 704,32; exit 872,128):');
for (let y = 24; y <= 140; y += 4) {
  let s = '';
  for (let x = 700; x <= 1000; x++) s += solid(x, y) ? '#' : '.';
  console.log('y' + y + ' ' + s);
}
for (let t = 0; t < 900; t++) T.stepSim(L);
const dead = T.state.lems.filter(l => l.dead).map(l => Math.round(l.x) + ',' + Math.round(l.y) + ':' + l.state);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued).map(l => Math.round(l.x) + ',' + Math.round(l.y) + '/' + l.state + '/' + l.dir);
console.log('t900 dead=' + dead.length + ' alive=' + alive.length + ' rescued=' + T.state.rescued);
console.log('alive:', alive.join('  '));
console.log('dead :', dead.slice(0, 20).join('  '));