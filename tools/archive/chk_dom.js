'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const names = { 128: '..', 129: 'EX', 130: 'FL', 131: 'FR', 133: 'WA', 134: 'FI', 137: 'ST', 138: 'BL' };
function domAt(x, y) {
  const cx = ((x & ~3) >> 2) + 4, cy = ((y & ~3) >> 2) + 4;
  const i = cy * 416 + cx;
  return L.dom[i];
}
for (let y = 40; y <= 108; y += 4) {
  const row = [];
  for (let x = 880; x <= 1120; x += 4) row.push(names[domAt(x, y)] || '_' + domAt(x, y));
  console.log('y' + y + ': ' + row.join(' '));
}
console.log('--- exit region 1060-1120 y84-104 ---');
for (let y = 84; y <= 104; y += 4) {
  const row = [];
  for (let x = 1060; x <= 1120; x += 4) row.push(names[domAt(x, y)] || '_' + domAt(x, y));
  console.log('y' + y + ': ' + row.join(' '));
}