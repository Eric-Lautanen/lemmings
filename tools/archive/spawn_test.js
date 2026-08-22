// Scratch: which spawn/exit convention matches the real game?
// Runs section 0 ('This should be a doddle!') with spawn=id1 (current engine)
// vs spawn=id0 (trigger effect says entrance) and reports rescue behavior.
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'));
const T = window._lemTest;

function run(spawnSel) {
  T.resetSection(0);
  const L = T.state.level;
  // swap spawn/exit selection in the loaded level
  const spawnObj = L.objs.find(o => (spawnSel === 'id0' ? o.id === 0 : o.id === 1));
  const exitObj = L.objs.find(o => (spawnSel === 'id0' ? o.id === 1 : o.id === 0));
  L.spawnX = spawnObj.x + 4; L.spawnY = spawnObj.y;
  L.exit = exitObj;
  let minX = 9999, maxX = 0, rescued = 0, dead = 0, splat = 0, drowned = 0;
  const where = {};
  for (let t = 0; t < 10000; t++) {
    T.stepSim(L);
    for (const l of T.state.lems) {
      if (l.dead) { dead++; continue; }
      if (l.rescued) { rescued++; continue; }
      minX = Math.min(minX, l.x); maxX = Math.max(maxX, l.x);
      where[Math.round(l.y)] = (where[Math.round(l.y)] || 0) + 1;
    }
    if (T.state.over) break;
  }
  const ys = Object.keys(where).sort((a, b) => a - b);
  return { spawnSel, over: T.state.over, released: T.state.released, rescued, dead, minX: Math.round(minX), maxX: Math.round(maxX), yRange: [ys[0], ys[ys.length - 1]] };
}
console.log(JSON.stringify(run('id1'), null, 1));
console.log(JSON.stringify(run('id0'), null, 1));
