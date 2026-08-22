'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetSection(0); // Tricky 1 raw section - walker turn behavior
const L = T.state.level;
const sol = (x, y) => (y >= 0 && y < L.H && x >= 0 && x < L.W) ? L.solid[x + y * L.W] : 0;
const l0 = () => T.state.lems[0];
while (!l0()) T.stepSim(L);
for (let t = 0; t < 460; t++) {
  const lem = l0();
  if (lem.state !== 'walk') { T.stepSim(L); continue; }
  const f = Math.round(lem.y);
  const d = lem.dir;
  const ax = Math.round(lem.x + (d > 0 ? 15 : -1));
  const fx = Math.round(lem.x + (d > 0 ? 11 : 0));
  const bx = Math.round(lem.x + (d > 0 ? 0 : 11));
  let dF = 0, dB = 0;
  while (dF <= 3 && !sol(fx, f + 1 + dF)) dF++;
  while (dB <= 3 && !sol(bx, f + 1 + dB)) dB++;
  let bodyOk = true;
  for (let by = f - 8; by < f; by++) if (sol(ax, by)) { bodyOk = false; break; }
  const aF = sol(ax, f), aF1 = sol(ax, f - 1), aB = sol(ax, f - 8);
  const turn = (aF && aF1) || (aB && !bodyOk);
  if (turn || (t >= 280 && t <= 320)) {
    console.log(`t=${t} x=${lem.x.toFixed(2)} y=${f} d=${d} ax=${ax} aF=${aF} aF1=${aF1} aB=${aB} bodyOk=${bodyOk} dF=${dF} dB=${dB} ${turn ? '<<< TURN' : ''}`);
  }
  if (lem.x > 420 && lem.state === 'walk' && t > 200) { T.stepSim(L); continue; }
  T.stepSim(L);
}
