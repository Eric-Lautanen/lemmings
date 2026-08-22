const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

T.resetLevel(0);
const L = T.state.level;
// plant a wall at x=500 (columns 500..503), rising 7+ px above the feet (top y=93), below to y=115
for (let yy = 93; yy <= 115; yy++) for (let xx = 500; xx <= 503; xx++) L.solid[yy * L.W + xx] = 1;
// flat floor from x=480..500
for (let yy = 101; yy <= 103; yy++) for (let xx = 480; xx <= 499; xx++) L.solid[yy * L.W + xx] = 1;
// spawn a climber walking right at x=470
T.state.lems = [{
  x: 470, y: 100, dir: 1, state: 'walk', frame: 0, tick: 0, vy: 0, fallY: 100,
  hatchDrop: 1, climber: 1, floater: 0, dead: 0, rescued: 0, timer: 0, buildN: 0,
  bn: 0, bricksLeft: 0, dgFirst: 1, digN: 0, mineN: 0, ohno: 0
}];
let seq = [];
for (let t = 0; t < 400; t++) {
  T.stepSim(L);
  const l = T.state.lems[0];
  if (l.state !== seq[seq.length - 1]) seq.push(l.state);
  if (l.state === 'climb' && t > 100) break;
  if (t % 50 === 0 || l.state === 'climb') console.log('t' + t, l.state, 'x', Math.round(l.x), 'y', Math.round(l.y), 'dir', l.dir);
}
console.log('state seq:', seq.join(' -> '));
const l = T.state.lems[0];
console.log('final:', l.state, 'x', Math.round(l.x), 'y', Math.round(l.y));
