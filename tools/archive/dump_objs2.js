'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(2);
const L = T.state.level;
console.log('triggers table:', JSON.stringify(T.state.triggers));
for (const o of L.objs) {
  console.log(`obj id=${o.id} dx=${o.dx} dy=${o.dy} dw=${o.dw} dh=${o.dh} anim=${!!o.anim} effect=${o.effect} triggerRect=(${o.x},${o.y},${o.w},${o.h})`);
}
console.log('spawn:', L.spawnX, L.spawnY, 'exit:', L.exit ? L.exit.x + ',' + L.exit.y + ',' + L.exit.w + ',' + L.exit.h : 'none');
console.log('skills:', JSON.stringify(L.skills), 'lems:', L.lems, 'rescue:', L.rescueNeed);
// dump DOM cells for the trap and exit regions
function domAt(x, y) { return L.dom[y * 1600 + x]; }
for (let y = 108; y <= 156; y++) {
  let s = `y=${y}: `;
  for (let x = 520; x <= 680; x += 4) s += domAt(x, y) + ' ';
  console.log(s);
}
