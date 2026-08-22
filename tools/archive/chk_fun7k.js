const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
console.log('exit:', JSON.stringify(L.exit));
console.log('block at 974-1000, rows 52-100:');
for (let y = 52; y <= 100; y += 2) {
  let row = '';
  for (let x = 960; x <= 1030; x++) row += solidAt(L, x, y) ? '#' : '.';
  console.log(String(y).padStart(3) + ' ' + row);
}
console.log('shelf/floor 870-900:');
for (let y = 84; y <= 100; y += 1) {
  let row = '';
  for (let x = 870; x <= 900; x++) row += solidAt(L, x, y) ? '#' : '.';
  console.log(String(y).padStart(3) + ' ' + row);
}
