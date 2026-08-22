'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(0);
const L = T.state.level;
const W = L.W;
for (let t = 0; t < 900; t++) {
  T.stepSim(L);
  if (t % 60 === 0) {
    const ws = T.state.lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const rows = new Set();
    for (const l of ws) {
      let g = 0, fy = Math.round(l.y) + 1;
      if (L.solid[fy * W + Math.round(l.x + (l.dir > 0 ? 11 : 0))]) {
        g = -1;
        while (fy + g >= 0 && L.solid[(fy + g) * W + Math.round(l.x + (l.dir > 0 ? 11 : 0))]) g--;
        g++;
      } else {
        g = 1;
        while (fy + g < 160 && !L.solid[(fy + g) * W + Math.round(l.x + (l.dir > 0 ? 11 : 0))] && g < 8) g++;
      }
      rows.add(fy + g);
    }
    const xs = ws.map(l => Math.round(l.x));
    const ys = ws.map(l => Math.round(l.y));
    console.log('t=%d walkers=%d x[%d..%d] y[%d..%d] groundRows=%s', t, ws.length,
      Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), [...rows].sort((a, b) => a - b).join(','));
    if (t >= 300) {
      const nearWall = ws.filter(l => l.x > 500);
      for (const l of nearWall.slice(0, 4)) {
        console.log('  nearWall x=%d y=%d dir=%d', Math.round(l.x), Math.round(l.y), l.dir);
      }
      if (t === 300) T.state.lems.forEach((l, i) => { if (l.x > 490 && i < 2) { console.log('  assign builder to lem', i, 'x=', Math.round(l.x), 'dir=', l.dir); T.assignSkill(L, l, 4); } });
    }
  }
}
console.log('final alive=%d walk=%d rescued=%d', T.state.lems.filter(l => !l.dead && !l.rescued).length,
  T.state.lems.filter(l => l.state === 'walk').length, T.state.rescued);
let tx = 0, ty = 0, td = 0;
for (const l of T.state.lems) { if (l.state === 'walk' && Math.abs(l.x - 1062) < 300) { tx = l.x; ty = l.y; td = l.dir; } }
console.log('eastmost walker x=%d y=%d dir=%d', tx, ty, td);