'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
const gfx = T.state.G ? T.state.G.gfx['3'] : null;
console.log('gfx key:', gfx ? Object.keys(T.state.G.gfx) : 'none');
const terr = gfx ? gfx.terrains : [];
console.log('terrain count:', terr.length);
for (let i = 0; i < terr.length; i++) {
  const t = terr[i];
  console.log(`tid ${i}: w=${t.w} h=${t.h}`);
}
console.log('--- pieces (x,y,mods,tid,terrain w/h) ---');
const pieces = T.state.pieces || L.pieces;
for (const p of pieces) {
  const t = terr[p.tid];
  console.log(`(${p.x},${p.y}) mods=${p.mods} tid=${p.tid} terrain=(${t ? t.w : '?'}x${t ? t.h : '?'})`);
}
console.log('--- grid rows y=140..160 ---');
for (let y = 140; y < 160; y++) {
  let s = `y=${y}: `;
  let start = -1;
  for (let x = 380; x < 960; x++) {
    if (L.solid[y * 1600 + x]) { if (start < 0) start = x; }
    else if (start >= 0) { s += start + '-' + (x - 1) + '  '; start = -1; }
  }
  if (start >= 0) s += start + '-959';
  console.log(s);
}
