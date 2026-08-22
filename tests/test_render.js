// Dump engine world renders (terrain + baked objects) as PPM for comparison
// with the Python reference renderer (tools/compare_render.py).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), { filename: 'game.js' });

const T = window._lemTest;
const out = path.join(__dirname, '..', 'build', 'render');
fs.mkdirSync(out, { recursive: true });
const meta = {};
for (let lvl = 0; lvl < 10; lvl++) {
  T.resetSection(lvl);   // raw 80-section level, matching compare_render.py
  const w = T.renderWorld();
  const name = `js_world_${lvl}.ppm`;
  let head = `P6\n${w.w} ${w.h}\n255\n`;
  fs.writeFileSync(path.join(out, name), Buffer.concat([Buffer.from(head), Buffer.from(w.rgb.buffer, w.rgb.byteOffset, w.rgb.length)]));
  meta[lvl] = { rects: w.rects };
  console.log('wrote', name, w.w + 'x' + w.h, 'objs', w.rects.length);
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
