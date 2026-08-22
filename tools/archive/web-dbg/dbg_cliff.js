'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(0);
const L0 = T.state.level;
const W = L0.W;
for (let y = 110; y <= 160; y++) {
  let line = String(y).padStart(3) + ' ';
  for (let x = 620; x <= 840; x++) line += L0.solid[y * W + x] ? '#' : '.';
  console.log(line);
}
console.log('\nexit obj:', JSON.stringify(L0.exit && { x: L0.exit.x, y: L0.exit.y, w: L0.exit.w, h: L0.exit.h }));
console.log('objects:');
for (const o of L0.objs) console.log('  id=%d x=%d y=%d w=%d h=%d dx=%d dy=%d effect=%d', o.id, o.x, o.y, o.w, o.h, o.dx, o.dy, o.effect);