const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const A = window.GAME_ASSETS;

T.resetLevel(6);
const L = T.state.level;
const solAt = (x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
let builds = 0;
for (let t = 0; t < 20000 && !T.state.over; t++) {
  for (const l of T.state.lems) {
    if (l.dead || l.rescued) continue;
    // builder for walkers facing a wall (solid ahead within 3px at head height, ground level)
    if ((l.state === 'walk' || l.state === 'shrug') && L.skills[4] > 0) {
      const fx = Math.round(l.x + (l.dir > 0 ? 11 : 0));
      if (solAt(fx, Math.round(l.y) - 7) && solAt(fx, Math.round(l.y) + 1)) {
        if (T.assignSkill(L, l, 4)) builds++;
      }
    }
    // blockers unused; rescue usually requires crossing; nothing else
  }
  T.stepSim(L);
}
console.log('over:', T.state.over, 'rescued:', T.state.rescued, 'builds:', builds);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('alive:', alive.length, 'max x:', alive.length ? Math.max(...alive.map(l => l.x)) : '-', 'maxY(min):', alive.length ? Math.min(...alive.map(l => l.y)) : '-');
const far = alive.sort((a, b) => b.x - a.x).slice(0, 3);
console.log(far.map(l => l.state + '@' + Math.round(l.x) + ',' + Math.round(l.y) + 'd' + l.dir).join(' | '));