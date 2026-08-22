const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const sol = (x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
let last = new Map();
for (let t = 0; t < 900; t++) {
  T.stepSim(L);
  const lead = T.state.lems[0];
  if (!lead) continue;
  const xx = Math.round(lead.x);
  if (xx > 690 && xx < 716) {
    const fx = xx + (lead.dir > 0 ? 11 : 0);
    console.log('t' + t, lead.state, 'x' + xx, 'y' + Math.round(lead.y), 'd' + lead.dir, 'front' + fx,
      'wall?', sol(fx, Math.round(lead.y) - 7) && sol(fx, Math.round(lead.y) + 1) ? 'YES' : 'no',
      'solid@col+1', sol(xx + 1, Math.round(lead.y)) && 'up' + ':' + [95, 96, 97].map(y => sol(xx + 1, y) ? '#' : '.').join(''));
  }
  if (lead.x > 715) break;
}