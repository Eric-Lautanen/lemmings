const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

T.resetLevel(0);
const L = T.state.level;
// every lem digs on arrival (10 lems / 10 diggers)
for (let t = 0; t < 4000; t++) {
  for (const l of T.state.lems) {
    if (!l.dead && !l.rescued && l.state === 'walk' && L.skills[7] > 0) {
      T.assignSkill(L, l, 7);
    }
  }
  if (T.state.over) break;
  T.stepSim(L);
}
console.log('result:', T.state.over, 'rescued:', T.state.rescued, 'released:', T.state.released);