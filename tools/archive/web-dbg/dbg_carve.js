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
for (const o of L.objs) {
  if (o.id <= 1) console.log('obj', o.id, 'dx', o.dx, 'dy', o.dy, 'dw', o.dw, 'dh', o.dh, 'trigger', o.x, o.y, o.w, o.h, 'effect', o.effect);
}
const g = window.GAME_ASSETS.gfx[L.gfx];
for (let i = 0; i < Math.min(g.objects.length, 20); i++) {
  const o = g.objects[i];
  if (o) console.log('gfxobj', i, 'w', o.w, 'h', o.h, 'frames', o.n, 'trigger', g.triggers[i]);
}
