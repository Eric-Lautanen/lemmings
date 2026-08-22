// Trace miner behavior on thick flat ground
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(7); // Fun 8, plenty of skills
const L = () => T.state.level;
const sol = (x, y) => x < 0 || y < 0 || x >= L().W || y >= L().H ? 0 : L().solid[y * L().W + x];

// find WIDE + thick flat ground: whole +-40px window solid at the surface row
let spot = null;
for (let x = 100; x < L().W - 120 && !spot; x += 8) {
  for (let y = 60; y < L().H - 30 && !spot; y++) {
    if (sol(x, y - 1)) continue;
    let ok = true;
    for (let dx = -48; dx <= 48 && ok; dx++) {
      if (!sol(x + dx, y)) { ok = false; break; }
      let d = 0;
      while (d < 22 && sol(x + dx, y + d)) d++;
      if (d < 20) ok = false;
    }
    if (ok) spot = { x, y };
  }
}
console.log('spot:', JSON.stringify(spot));

let m = null;
for (let t = 0; t < 3000 && !m; t++) {
  T.stepSim(L());
  m = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk');
}
m.x = spot.x; m.y = spot.y - 1; m.dir = 1;
console.log('assigned:', T.assignSkill(L(), m, 6));
for (let t = 0; t < 150; t++) {
  T.stepSim(L());
  if (t % 3 === 0 || m.state !== 'mine') {
    console.log(`t=${t} ${m.state} x=${Math.round(m.x)} y=${Math.round(m.y)} f=${m.frame} ` +
      `below=${sol(Math.round(m.x), Math.round(m.y) + 1)} domBelow=${L().dom[(Math.round(m.y) + 5) * L().W + Math.round(m.x)]}`);
  }
  if (m.state !== 'mine' && m.state !== 'fall') break;
  if (m.dead) break;
}
