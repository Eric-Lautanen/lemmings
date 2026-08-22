'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
const g = window.GAME_ASSETS.gfx[L.gfx];
const ts = g.terrains;
const lv = window.GAME_ASSETS.levels[2];
console.log('gfx set:', L.gfx, 'terrain count:', ts.length);
for (let i = 0; i < ts.length; i++) console.log(`tid ${i}: ${ts[i] ? ts[i].w + 'x' + ts[i].h : 'null'}`);
console.log('--- pieces (x, y, mods, tid, size), y>=100 ---');
const list = [];
for (const te of lv.terrain) {
  const tid = te[3], t = ts[tid];
  list.push({ x: te[0], y: Math.round(te[2]), mods: te[1], tid, w: t ? t.w : 0, h: t ? t.h : 0 });
}
list.sort((a, b) => (a.y - b.y) || (a.x - b.x));
for (const p of list) {
  if (p.y >= 80) console.log(`(${p.x},${p.y}) mods=${p.mods} tid=${p.tid} ${p.w}x${p.h}`);
}
console.log('--- grid rows y=145..160 ---');
for (let y = 145; y < 160; y++) {
  let s = `y=${y}: `;
  let start = -1;
  for (let x = 380; x < 960; x++) {
    if (L.solid[y * 1600 + x]) { if (start < 0) start = x; }
    else if (start >= 0) { s += start + '-' + (x - 1) + '  '; start = -1; }
  }
  if (start >= 0) s += start + '-959';
  console.log(s);
}