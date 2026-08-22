'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetSection(0);
const L = T.state.level;
const sol = (x, y) => (y >= 0 && y < L.H && x >= 0 && x < L.W) ? L.solid[x + y * 1600] : 0;
T.state.rate = 99;
let lem0 = null;
for (let t = 0; t < 60; t++) {
  T.stepSim(L);
  if (!lem0 && T.state.lems.length) lem0 = T.state.lems[0];
  if (!lem0) continue;
  const f = Math.round(lem0.y);
  const d = lem0.dir;
  const ax = Math.round(lem0.x + (d > 0 ? 15 : -1));
  const fx = Math.round(lem0.x + (d > 0 ? 11 : 0));
  const bx = Math.round(lem0.x + (d > 0 ? 0 : 11));
  let dF = 0, dB = 0;
  while (dF <= 3 && !sol(fx, f + 1 + dF)) dF++;
  while (dB <= 3 && !sol(bx, f + 1 + dB)) dB++;
  let bodyOk = true;
  for (let by = f - 8; by < f; by++) if (sol(ax, by)) { bodyOk = false; break; }
  console.log(`t=${t} x=${lem0.x.toFixed(1)} y=${f} d=${d} s=${lem0.state} ax=${ax} aF=${sol(ax,f)} aF1=${sol(ax,f-1)} aB=${sol(ax,f-8)} bodyOk=${bodyOk} dF=${dF} dB=${dB}`);
  if (t > 12) break;
}