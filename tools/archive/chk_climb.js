const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

T.resetLevel(7);
const Lc = T.state.level;
let climber = false, climbed = null;
for (let t = 0; t < 1200 && !climbed; t++) {
  T.stepSim(Lc);
  const lem0 = T.state.lems[0];
  if (!lem0) continue;
  if (lem0.dead || lem0.rescued) break;
  if (!climber && lem0.state === 'walk') { lem0.climber = 1; climber = true; }
  if (lem0.state === 'climb') climbed = ['climb', Math.round(lem0.x), Math.round(lem0.y), t];
  if (lem0.state === 'hoist') climbed = ['hoist', Math.round(lem0.x), Math.round(lem0.y), t];
}
console.log('climbed:', JSON.stringify(climbed));
if (climbed) {
  for (let t = 0; t < 500; t++) T.stepSim(Lc);
  const l0 = T.state.lems[0];
  console.log('after: state', l0.state, 'x', Math.round(l0.x), 'y', Math.round(l0.y), 'dead', l0.dead, 'rescued', l0.rescued);
}
