const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
const ranges = (y) => {
  let out = [], start = -1;
  for (let x = 0; x < L.W; x++) {
    const s = solidAt(L, x, y) ? 1 : 0;
    if (s && start < 0) start = x;
    if (!s && start >= 0) { out.push(start + '-' + (x - 1)); start = -1; }
  }
  if (start >= 0) out.push(start + '-' + (L.W - 1));
  return out.join(',') || '-';
};
for (let y = 40; y <= 100; y++) {
  console.log('y' + y + ': ' + ranges(y));
}
