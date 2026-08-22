'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const solOf = L => (x, y) => L.solid[x + y * L.W];

// --- basher trace on lvl 3 ---
T.resetSection(3);
let L3 = T.state.level;
let nudged = false, bashed = false, lastDir = 1, lem0 = null;
for (let t = 0; t < 3000 && !bashed; t++) {
  T.stepSim(L3);
  lem0 = T.state.lems[0];
  if (!lem0 || lem0.dead || lem0.rescued) continue;
  if (!nudged && lem0.state === 'walk') { lem0.dir = -1; nudged = true; }
  if (nudged && lem0.dir === -1 && lastDir === 1) {
    T.assignSkill(L3, lem0, 5);
    bashed = true;
    console.log('basher assigned at', Math.round(lem0.x), Math.round(lem0.y), 'state', lem0.state);
  }
  lastDir = lem0.dir;
}
if (bashed) {
  const before = L3.solid.reduce((a, b) => a + b, 0);
  for (let t = 0; t < 120; t++) {
    T.stepSim(L3);
    if (t < 60 && t % 5 === 0) {
      const l = T.state.lems[0];
      console.log(`bash t=${t}: x=${l.x.toFixed(1)} y=${l.y.toFixed(1)} state=${l.state} bashN=${l.bashN||0}`);
    }
  }
  const after = L3.solid.reduce((a, b) => a + b, 0);
  console.log('solid', before, '->', after, 'delta', after - before);
}

// --- builder trace on section 6 (Fun 7 'Builders will help you here') ---
T.resetSection(6);
const L0b = T.state.level;
let bb = null;
for (let t = 0; t < 2200 && !bb; t++) {
  T.stepSim(L0b);
  bb = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk');
}
if (bb) {
  const bbefore = L0b.solid.reduce((a, b) => a + b, 0);
  T.assignSkill(L0b, bb, 4);
  const sol = solOf(L0b);
  console.log('builder assigned at', bb.x.toFixed(1), bb.y.toFixed(1), 'dir', bb.dir, 'f', Math.round(bb.y),
    'aheadX', Math.round(bb.x + bb.dir * 15), 'solid(aheadX,f)', sol(Math.round(bb.x + bb.dir * 15), Math.round(bb.y)));
  for (let t = 0; t < 80; t++) {
    T.stepSim(L0b);
    if (t < 60 && t % 5 === 0) {
      const l = T.state.lems[0];
      console.log(`build t=${t}: x=${l.x.toFixed(1)} y=${l.y.toFixed(1)} state=${l.state} buildN=${l.buildN||0}`);
    }
  }
  const bafter = L0b.solid.reduce((a, b) => a + b, 0);
  console.log('solid', bbefore, '->', bafter, 'delta', bafter - bbefore);
} else console.log('no builder candidate');