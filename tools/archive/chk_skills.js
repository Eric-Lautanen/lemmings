const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;

// --- Fun1 win ---
T.resetLevel(0);
const L = T.state.level;
for (let t = 0; t < 4000; t++) {
  for (const l of T.state.lems)
    if (!l.dead && !l.rescued && l.state === 'walk' && L.skills[7] > 0) T.assignSkill(L, l, 7);
  if (T.state.over) break;
  T.stepSim(L);
}
console.log('Fun1 win:', T.state.over, 'rescued:', T.state.rescued);

// --- climber: find a level where a lem meets a wall; give the first lem a climber ---
let climbOk = null;
for (let lvl = 0; lvl < 120 && !climbOk; lvl++) {
  T.resetLevel(lvl);
  const Lc = T.state.level;
  for (let t = 0; t < 600 && !climbOk; t++) {
    for (const l of T.state.lems) {
      if (!l.dead && !l.rescued && l.state === 'walk' && Lc.skills[0] > 0) {
        const before = l.y;
        T.assignSkill(Lc, l, 0); // climber
        T.stepSim(Lc);
        // did it start climbing within the next 100 ticks?
        let saw = false;
        for (let k = 0; k < 100; k++) {
          T.stepSim(Lc);
          if (l.state === 'climb' || l.state === 'hoist') { saw = true; break; }
        }
        if (saw) climbOk = [lvl, Math.round(l.x), Math.round(l.y), l.dir];
        break;
      }
    }
    if (!climbOk && !T.state.lems.some(l => !l.dead && !l.rescued)) break;
  }
}
console.log('climb trigger:', climbOk ? 'OK on ' + JSON.stringify(climbOk) : 'NONE (no wall met in 600 ticks)');

// --- miner: carve down through terrain on Fun1's dig column ---
T.resetLevel(0);
const Lm = T.state.level;
let mined = 0, miner = null;
for (let t = 0; t < 1500 && !miner; t++) {
  for (const l of T.state.lems)
    if (!l.dead && !l.rescued && l.state === 'walk' && Lm.skills[6] > 0) { miner = l; T.assignSkill(Lm, l, 6); break; }
  T.stepSim(Lm);
}
const m0 = Lm.solid.reduce((a, b) => a + b, 0);
for (let t = 0; t < 600; t++) T.stepSim(Lm);
const m1 = Lm.solid.reduce((a, b) => a + b, 0);
console.log('miner: assigned=' + !!miner, 'removed=' + (m0 - m1), 'state=' + (miner && miner.state), 'y=' + (miner && Math.round(miner.y)));
