const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

T.resetLevel(0);
const L = T.state.level;
const picks = [];
for (let t = 0; t < 4000; t++) {
  for (const l of T.state.lems) {
    if (!l.dead && !l.rescued && l.state === 'walk' && L.skills[7] > 0 && !l.handled) {
      T.assignSkill(L, l, 7); l.handled = 1;
    }
  }
  if (T.state.over) break;
  T.stepSim(L);
  if (t % 400 === 0) {
    const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
    if (!picks[t]) picks[t] = alive.slice(0, 3).map(l => l.state + '@' + Math.round(l.x) + ',' + Math.round(l.y) + 'd' + l.dir);
  }
}
for (const k of Object.keys(picks)) console.log('t' + k, JSON.stringify(picks[k]));
console.log('over:', T.state.over, 'rescued:', T.state.rescued);
console.log('lems:', T.state.lems.map(l => l.state + '@' + Math.round(l.x) + ',' + Math.round(l.y) + ' d' + l.dir + (l.dead ? ' DEAD' : l.rescued ? ' RESC' : '')).join(' | '));
console.log('window below exit:', [872, 880, 888, 896].map(x => [x, 132, 136, 140, 144, 148, 152].map(y => L.solid[y * L.W + x] ? '#' : '.')).join(' '));