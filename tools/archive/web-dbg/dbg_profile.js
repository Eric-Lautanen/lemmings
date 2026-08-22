'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetSection(0);
const L = T.state.level;
const W = L.W;

// ground profile: topmost solid row in y in [110, 140] per x (2px step), -1 if none
let line = '     ';
for (let x = 400; x < 620; x += 2) {
  let top = -1;
  for (let y = 110; y <= 140 && top < 0; y++) if (L.solid[y * W + x]) top = y;
  const ch = top < 0 ? ' ' : String(top % 10);
  line += ch;
}
console.log('x 400-618 (2px) topmost-solid-row in 110..140:');
console.log('    ' + line);

// full columns detail around the shaft base: solid presence rows 116..132 for x 415..460
console.log('\nx 415-460 per-pixel, rows 116-132 (#=solid):');
for (let y = 116; y <= 132; y++) {
  let r = ''.padStart(3) + y + ' ';
  for (let x = 415; x <= 460; x++) r += L.solid[y * W + x] ? '#' : '.';
  console.log(r);
}
console.log('\nright of tower: x 460-560 rows 116-132:');
for (let y = 116; y <= 132; y++) {
  let r = ''.padStart(3) + y + ' ';
  for (let x = 460; x <= 560; x++) r += L.solid[y * W + x] ? '#' : '.';
  console.log(r);
}