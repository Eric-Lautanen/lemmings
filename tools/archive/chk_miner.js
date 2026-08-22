const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

// Why did the miner fail on Fun1? inspect the DOM at the lem's position
T.resetLevel(0);
const L = T.state.level;
console.log('objs:', L.objs.map(o => 'id' + o.id + '@' + o.x + ',' + o.y + ' eff' + o.effect).join(' | '));
for (let t = 0; t < 300; t++) {
  for (const l of T.state.lems) {
    if (!l.dead && !l.rescued && l.state === 'walk') {
      const fx = Math.round(l.x + l.dir * 8), fy = Math.round(l.y) - 8;
      const fv = T.domAt(L, fx, fy), bv = T.domAt(L, Math.round(l.x), Math.round(l.y));
      console.log('t' + t, 'walk@', Math.round(l.x), Math.round(l.y), 'dir', l.dir,
        'front', fv, 'below', bv, 'oneway', T.oneWayAt(L, Math.round(l.x), Math.round(l.y)));
      t = 9999; break;
    }
  }
  T.stepSim(L);
}
