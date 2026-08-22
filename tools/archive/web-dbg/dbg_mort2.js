'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetSection(0);
const L0 = T.state.level;
const W = L0.W;
console.log('spawn=%d,%d exit=%d,%d solid=%d cam=%d rate=%d lems=%d rescue=%d skills=%s',
  L0.spawnX, L0.spawnY, L0.exit ? L0.exit.x : -1, L0.exit ? L0.exit.y : -1,
  L0.solid.reduce((a, b) => a + b, 0), L0.cam, L0.rate, L0.lems, L0.rescueNeed, L0.skills.join(','));

// full map, 2px per char vertically, 4px per char horizontally
for (let y = 0; y < 160; y += 2) {
  let line = String(y).padStart(3) + ' ';
  for (let x = 0; x < 1600; x += 4) {
    let s = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 4; dx++) {
      if (L0.solid[(y + dy) * W + x + dx]) { s = 1; break; }
    }
    line += s ? '#' : '.';
  }
  console.log(line);
}

// trace all deaths with cause + location
const deaths = { belowWorld: 0, splat: 0, hazard: 0, direct: 0 };
const deathX = [];
const MAXT = 4800;
for (let t = 0; t < MAXT; t++) {
  T.stepSim(L0);
  for (const l of T.state.lems) {
    if (!l.dead || l.__counted) continue;
    l.__counted = 1;
    if (l.state === 'splat') { deaths.splat++; deathX.push([Math.round(l.x), Math.round(l.y), 'splat', Math.round(l.fallY) - Math.round(l.y)]); }
    else if (l.y > 200) { deaths.belowWorld++; deathX.push([Math.round(l.x), Math.round(l.y), 'below', 0]); }
    else { deaths.hazard++; deathX.push([Math.round(l.x), Math.round(l.y), 'other', 0]); }
  }
}
console.log('\ndeaths:', JSON.stringify(deaths));
const xb = {};
for (const d of deathX) { const k = Math.floor(d[0] / 64) * 64; xb[k] = (xb[k] || 0) + 1; }
console.log('death x-buckets:', Object.entries(xb).sort((a, b) => a[0] - b[0]).map(([k, v]) => k + ':' + v).join(' '));
console.log('sample deaths:', deathX.slice(0, 25).map(d => d.join(',')).join(' | '));
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('end: released=%d survivors=%d rescued=%d', T.state.released, alive.length, T.state.rescued);
if (alive.length) {
  const ax = alive.map(l => Math.round(l.x));
  const ay = alive.map(l => Math.round(l.y));
  console.log('survivor x[%d..%d] y[%d..%d]', Math.min(...ax), Math.max(...ax), Math.min(...ay), Math.max(...ay));
}