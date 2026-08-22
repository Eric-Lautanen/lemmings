const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const A = window.GAME_ASSETS;

// ---- miner: find a menu level with miners and a walker on terrain ----
let minerRes = null;
for (let lvl = 0; lvl < 120 && !minerRes; lvl++) {
  const me = A.menu[lvl];
  if (!me.skills[6]) continue;
  T.resetLevel(lvl);
  const Lm = T.state.level;
  for (let t = 0; t < 2000; t++) {
    let assigned = false;
    for (const l of T.state.lems)
      if (!l.dead && !l.rescued && l.state === 'walk' && Lm.skills[6] > 0) { T.assignSkill(Lm, l, 6); assigned = true; break; }
    if (assigned) {
      const s0 = Lm.solid.reduce((a, b) => a + b, 0);
      for (let k = 0; k < 400; k++) T.stepSim(Lm);
      const s1 = Lm.solid.reduce((a, b) => a + b, 0);
      const anyM = T.state.lems.filter(l => l.state === 'mine');
      minerRes = [lvl, me.name.trim(), s0 - s1, anyM.length];
      break;
    }
    T.stepSim(Lm);
  }
}
console.log('miner:', minerRes ? 'lvl' + minerRes[0] + ' "' + minerRes[1] + '" removed=' + minerRes[2] + ' miners=' + minerRes[3] : 'no miner level walk found');

// ---- climber: scout a wall on Fun8 (index 7), then re-run with climber assigned before the wall ----
T.resetLevel(7);
const Lw = T.state.level;
let wallTick = null, wallLem = null, wallX = null;
for (let t = 0; t < 3000 && !wallTick; t++) {
  for (const l of T.state.lems) {
    if (l.dead || l.rescued || l.state !== 'walk') continue;
    if (l.dir > 0 && Lw.solid[Math.round(l.y) * Lw.W + Math.round(l.x) + 12]) { wallTick = t; wallLem = l; wallX = Math.round(l.x); break; }
    if (l.dir < 0 && Lw.solid[Math.round(l.y) * Lw.W + Math.round(l.x) - 2]) { wallTick = t; wallLem = l; wallX = Math.round(l.x); break; }
  }
  T.stepSim(Lw);
}
console.log('wall scouted at tick', wallTick, 'x', wallX);
if (wallTick !== null) {
  T.resetLevel(7);
  const Lc = T.state.level;
  let ok = null;
  for (let t = 0; t < 2500 && !ok; t++) {
    for (const l of T.state.lems) {
      if (!l.dead && !l.rescued && l.state === 'walk' && Lc.skills[0] > 0 && Math.abs(l.x - wallX) < 40) {
        T.assignSkill(Lc, l, 0);
      }
    }
    const climbers = T.state.lems.filter(l => l.state === 'climb' || l.state === 'hoist');
    if (climbers.length) ok = [climbers[0].state, Math.round(climbers[0].x), Math.round(climbers[0].y), climbers[0].dir];
    T.stepSim(Lc);
  }
  console.log('climb:', ok ? 'OK ' + JSON.stringify(ok) : 'never climbed');
}
