const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
for (let g = 0; g < A.gfx.length; g++) {
  const G = A.gfx[g];
  const rows = [];
  for (let i = 0; i < G.objects.length; i++) {
    const o = G.objects[i];
    if (!o) continue;
    rows.push('obj' + i + ' w' + o.w + ' n' + o.n + ' s' + o.s + ' a=' + o.a);
  }
  console.log('gfx ' + g + ': ' + rows.join(' | '));
}