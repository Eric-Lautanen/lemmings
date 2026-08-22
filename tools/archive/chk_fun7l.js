const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
console.log('exit:', JSON.stringify({ x: L.exit.x, y: L.exit.y, w: L.exit.w, h: L.exit.h }));
console.log('right side 950-1100:');
for (let y = 48; y <= 100; y += 2) {
  let row = '';
  for (let x = 950; x <= 1100; x++) row += solidAt(L, x, y) ? '#' : '.';
  console.log(String(y).padStart(3) + ' ' + row);
}
console.log('entrance:', JSON.stringify(L.entrance));
