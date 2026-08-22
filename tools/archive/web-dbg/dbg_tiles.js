'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.state.level = T.loadLevel(0);
const L = T.state.level;
const g = window.GAME_ASSETS.gfx[L.gfx];
const ts = g.terrains;
const lv = window.GAME_ASSETS.levels[0];
console.log('--- terrain pieces (tid, x, y, w, h, mods) sorted by y ---');
const list = [];
for (const te of lv.terrain) {
  const tid = te[3];
  const t = ts[tid];
  const w = t ? t.w : 0, h = t ? t.h : 0;
  list.push({ tid, x: te[0], y: Math.round(te[2]), mods: te[1], w, h });
}
list.sort((a, b) => a.x - b.x);
for (const p of list) {
  console.log('tid', p.tid, 'x', p.x, 'y', p.y, 'size', p.w + 'x' + p.h, 'mods', p.mods);
}
