// Verify countdown digit sequence per-lemming during nuke
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', '..', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', '..', 'game.js'), 'utf8'));
const T = window._lemTest;

T.resetLevel(0); // Fun 1
const L = T.state.level;
for (let t = 0; t < 400 && T.state.lems.length < 5; t++) T.stepSim(L);
T.state.pending = 0;
T.nukeAll(L);

function digitFor(tmr) {
  return tmr > 64 ? 5 : tmr > 48 ? 4 : tmr > 32 ? 3 : tmr > 16 ? 2 : 1;
}

// track lem[0]'s displayed digit sequence
const seq = [];
let last = null;
for (let t = 0; t < 300; t++) {
  T.stepSim(L);
  const l0 = T.state.lems[0];
  if (!l0 || l0.dead || l0.rescued) break;
  if (l0.explosionTimer > 0) {
    const d = digitFor(l0.explosionTimer);
    if (d !== last) { seq.push(`${d}@t${t}`); last = d; }
  }
}
console.log('lem[0] digit transitions:', seq.join(' -> '));
console.log('(expect 5 -> 4 -> 3 -> 2 -> 1)');
