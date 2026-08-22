'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const A = window.GAME_ASSETS;
const SK = ['climb', 'float', 'bomb', 'block', 'build', 'bash', 'mine', 'dig'];
for (let lvl = 0; lvl < 120; lvl++) {
  T.resetLevel(lvl);
  const L = T.state.level;
  const m = A.menu[lvl];
  const skills = m.skills.map((s, i) => s ? SK[i] + ':' + s : null).filter(Boolean).join(' ');
  const exit = L.exit ? L.exit.x + ',' + L.exit.y + ' ' + L.exit.w + 'x' + L.exit.h : '-';
  const ent = L.entrances.map(e => e.x + ',' + e.y).join(' ');
  console.log('lvl' + lvl + ' [' + m.section + '] ' + m.name + ' | lems=' + m.lems + ' need=' + m.rescue
    + ' rate=' + m.rate + ' time=' + L.timelimit + ' | skills: ' + skills + ' | exit: ' + exit + ' | ent: ' + ent);
}