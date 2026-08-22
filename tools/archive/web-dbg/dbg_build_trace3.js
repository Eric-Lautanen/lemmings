const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
const L = () => T.state.level;
const lastDir = new Map();
let n = 0;
for (let t = 0; t < 1200 && !T.state.over; t++) {
  T.stepSim(L());
  for (const l of T.state.lems) {
    if (l.dead || l.rescued || l.state !== 'walk') { lastDir.set(l, l.dir); continue; }
    const prev = lastDir.get(l);
    lastDir.set(l, l.dir);
    if (prev === undefined || prev === l.dir) continue;
    const x = Math.round(l.x), y = Math.round(l.y);
    if (l.dir < 0 && x > 640 && x < 725 && y > 110 && n < 6) {
      l.dir = 1;
      if (T.assignSkill(L(), l, 4)) {
        n++;
        console.log(`assign #${n} at t=${t} x=${x} y=${y}`);
        // trace this builder
        const b = l;
        let lastState = '';
        for (let s = 0; s < 220; s++) {
          T.stepSim(L());
          if (b.state !== lastState || s % 32 === 0) {
            console.log(`   s=${s} ${b.state} x=${Math.round(b.x)} y=${Math.round(b.y)} bricks=${b.bricksLeft}`);
            lastState = b.state;
          }
          if (b.state === 'walk' && s > 8) break;
          if (b.dead) break;
        }
      }
    }
  }
}
