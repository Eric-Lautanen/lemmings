const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const A = window.GAME_ASSETS;

T.resetLevel(6); // Fun 7: Builders will help you here
const L = T.state.level;
console.log('Fun7:', L.name, 'lems', L.lems, 'rescueNeed', L.rescueNeed, 'rate', L.rate, 'time', L.timeLimit ? '' : '');
console.log('objs:', L.objs.map(o => 'id' + o.id + '@' + o.dx + ',' + o.dy + ' eff' + o.effect).join(' | '));

// auto-play: assign builder to the first walker that is still on the start ledge
let assigned = 0;
for (let t = 0; t < 9000 && !T.state.over; t++) {
  for (const l of T.state.lems) {
    if (l.dead || l.rescued || l.state !== 'walk') continue;
    if (L.skills[4] > 0 && assigned === 0) {
      if (T.assignSkill(L, l, 4)) { assigned = t; }
    }
    // extra builders for lems standing at the gap edge (shrugged after first builder)
    if (L.skills[4] > 0 && l.state === 'shrug' && assigned > 0) {
      T.assignSkill(L, l, 4);
    }
  }
  T.stepSim(L);
}
console.log('over:', T.state.over, 'rescued:', T.state.rescued, 'released:', T.state.released, 'assigned at t' + assigned);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('alive:', alive.length, alive.map(l => l.state + '@' + Math.round(l.x) + ',' + Math.round(l.y)).join(' | '));