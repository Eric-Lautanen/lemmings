'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
const lv = window.GAME_ASSETS.levels[78];
console.log('name:', lv.name, 'terrain count:', lv.terrain.length, 'gfxset:', lv.gfxset);
const g = window.GAME_ASSETS.gfx[lv.gfxset];
const ts = g.terrains;
const list = [];
for (const te of lv.terrain) {
  const tid = te[3];
  list.push({ x: te[0], y: Math.round(te[2]), mods: te[1], tid, w: ts[tid] ? ts[tid].w : 0, h: ts[tid] ? ts[tid].h : 0 });
}
list.sort((a, b) => (a.y - b.y) || (a.x - b.x));
for (const p of list) {
  if (p.y >= 100) console.log(`(${p.x},${p.y}) mods=${p.mods} tid=${p.tid} ${p.w}x${p.h}`);
}
console.log('total pieces:', list.length);