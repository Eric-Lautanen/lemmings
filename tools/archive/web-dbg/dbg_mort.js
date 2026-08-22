'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(0);
const L0 = T.state.level;

// carveShaft impact
const before = L0.solid.reduce((a, b) => a + b, 0);
const W = L0.W;

// trace deaths
const deaths = { splat: 0, fall: 0, drowned: 0, dead: 0 };
const splatFalls = [];   // [fallH, x, yStart, yEnd]
const MAXT = 4800;
for (let t = 0; t < MAXT; t++) {
  T.stepSim(L0);
  for (const l of T.state.lems) {
    if (!l.dead) continue;
    const d = L0.solid[(Math.round(l.y) + 1) * W + Math.round(l.x)];
    if (l.state === 'splat') {
      deaths.splat++;
      splatFalls.push([Math.round(l.fallY) - Math.round(l.y), Math.round(l.x), Math.round(l.fallY), Math.round(l.y)]);
      l.fallY = -999; // count once
    }
  }
}
// fall height distribution
const hist = {};
for (const f of splatFalls) {
  const k = Math.floor(f[0] / 8) * 8;
  hist[k] = (hist[k] || 0) + 1;
}
console.log('MAXT=%d  released=%d  survivors(alive/exit)=%d  rescued=%d',
  MAXT, T.state.released, T.state.lems.filter(l => !l.dead && !l.rescued).length, T.state.rescued);
console.log('splat total=%d', splatFalls.length);
console.log('fall-height hist (>=y):', Object.entries(hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => k + 'px:' + v).join(' '));

// death locations: bucket x
const xb = {};
for (const f of splatFalls) {
  const k = Math.floor(f[1] / 64) * 64;
  xb[k] = (xb[k] || 0) + 1;
}
console.log('death x-buckets (starting 0, 64px):', Object.entries(xb).sort((a, b) => a[0] - b[0]).map(([k, v]) => k + ':' + v).join(' '));

// deepest falls: where do they die - x, fromY, toY + terrain below
console.log('\ntop 8 deadliest splats (fallH, x, yStart, yEnd, groundY@x):');
const sorted = splatFalls.slice().sort((a, b) => b[0] - a[0]).slice(0, 8);
for (const f of sorted) {
  const x = f[1], gy = f[3];
  console.log('  fall=%dpx x=%d y %d->%d', f[0], x, f[2], f[3]);
}

// x range of survivors at end
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
const ax = alive.map(l => Math.round(l.x));
if (ax.length) console.log('\nsurvivors: n=%d x[%d..%d]', ax.length, Math.min(...ax), Math.max(...ax));