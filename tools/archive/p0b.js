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
console.log('exit rect solid?', [872, 873, 874, 875].map(x => x + ':' + solid(x, 128) + solid(x, 129) + solid(x, 130)).join(' '));
for (let t = 0; t < 3000; t++) T.stepSim(L);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued).map(l => Math.round(l.x) + ',' + Math.round(l.y) + '/' + l.state + '/' + l.dir);
const dead = T.state.lems.filter(l => l.dead).map(l => Math.round(l.x) + ',' + Math.round(l.y) + ':' + l.state);
console.log('t3000 dead=' + dead.length + ' alive=' + alive.length + ' rescued=' + T.state.rescued + ' over=' + T.state.over);
console.log('alive:', alive.join('  '));
console.log('dead :', dead.slice(0, 15).join('  '));
let lastHead = '';
for (let t = 0; t < 3000; t += 300) {
  T.stepSim(L);
}
console.log('exit rect DOM:', require('fs').existsSync('x') ? '' : '');
for (const e of L.entrances) console.log('entrance', e.x, e.y);
console.log('exit obj:', JSON.stringify(L.exit));