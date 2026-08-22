const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const A = window.GAME_ASSETS;

const found = [];
for (let lvl = 0; lvl < 120 && found.length < 5; lvl++) {
  if (!A.menu[lvl].skills[0]) continue;
  T.resetLevel(lvl);
  const L = T.state.level;
  const tagged = new Set();
  let hit = null;
  for (let t = 0; t < 3000 && !hit; t++) {
    T.stepSim(L);
    for (const l of T.state.lems) {
      if (l.dead || l.rescued || l.state !== 'walk') continue;
      if (!tagged.has(l)) { tagged.add(l); l.climber = 1; }
      if (l.state === 'climb') { hit = [t, Math.round(l.x), Math.round(l.y), l.dir]; break; }
    }
    if (T.state.over) break;
  }
  if (hit) found.push([lvl, A.menu[lvl].name.trim(), ...hit]);
}
console.log('levels with a climbable wall:', JSON.stringify(found));
