const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
let phase = 1, builder = null;
for (let t = 0; t < 1400; t++) {
  T.stepSim(T.state.level);
  for (const l of T.state.lems) {
    if (!builder && l.state !== 'walk') continue;
    if (l.dead || l.rescued || l.state !== 'walk' || l.dir <= 0) continue;
    const x = Math.round(l.x), y = Math.round(l.y);
    if (phase === 1 && x >= 694 && x <= 710 && y >= 125) {
      if (T.assignSkill(T.state.level, l, 4)) { phase = 2; console.log(`t=${t} wall builder ${x},${y}`); }
    } else if (phase === 2 && x >= 940 && x <= 971 && y >= 90 && y <= 100) {
      if (T.assignSkill(T.state.level, l, 4)) { console.log(`t=${t} pit builder at ${x},${y}`); builder = l; phase = 3; }
    }
  }
  if (builder && t % 16 === 0) {
    console.log(`t=${t} ${builder.state} x=${Math.round(builder.x)} y=${Math.round(builder.y)} bricks=${builder.bricksLeft} dir=${builder.dir} stT=${builder.stT} tick=${builder.tick}`);
  }
}
