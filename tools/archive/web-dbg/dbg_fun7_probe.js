const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
T.resetLevel(6);
for (let t = 0; t < 6000 && !T.state.over; t++) {
  T.stepSim(T.state.level);
  if (t % 200 === 0) {
    const ws = T.state.lems.filter(l => !l.dead && !l.rescued);
    const sample = ws.slice(0, 6).map(l => `${Math.round(l.x)},${Math.round(l.y)}:${l.state[0]}${l.dir > 0 ? '>' : '<'}`).join(' ');
    console.log(`t=${t} alive=${ws.length} out=${T.state.lems.length} rescued=${T.state.rescued} | ${sample}`);
  }
}
console.log('end:', T.state.over, 'rescued=', T.state.rescued, 'released=', T.state.released, 'pending=', T.state.pending);
