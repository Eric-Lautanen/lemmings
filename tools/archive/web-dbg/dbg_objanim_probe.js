// Probe: object animation pipeline (water/fire/spinners) headless
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;
const A = window.GAME_ASSETS;

// 1. survey: which sections have animated objects?
let found = { continuous: null, trap: null };
for (let s = 0; s < 80 && (found.continuous === null || found.trap === null); s++) {
  T.resetSection(s);
  const L = T.state.level;
  for (const o of L.anims) {
    if (o.id === 1) continue;
    if (o.anim === 2 && !found.continuous) found.continuous = { sec: s, id: o.id, fr: o.fr, start: o.start, dx: o.dx, dy: o.dy };
    if (o.anim === 1 && !found.trap) found.trap = { sec: s, id: o.id, fr: o.fr };
  }
}
console.log('first continuous object:', JSON.stringify(found.continuous));
console.log('first triggered trap   :', JSON.stringify(found.trap));

// 2. frame sequence over ticks for the continuous object
if (found.continuous) {
  const c = found.continuous;
  T.resetSection(c.sec);
  const frames = [];
  for (let t = 0; t < 40; t++) {
    T.stepSim(T.state.level);
    // replicate draw()'s selection for continuous
    frames.push(((c.start || 0) + T.state.tick) % Math.max(1, c.fr));
  }
  console.log('continuous frame sequence (40 ticks):', frames.slice(0, 20).join(','));

  // 3. do the ART frames differ? compare pixel data of frame canvases via renderWorld trick:
  // use gfxSet cache directly
  const g = A.gfx[T.state.level.gfx];
  const ob = g.objects[c.id];
  let distinct = new Set();
  for (let f = 0; f < Math.min(ob.n, 8); f++) {
    const d = Buffer.from(f === undefined ? '' : atobSafe(ob.f[f][0]));
    distinct.add(d.toString('base64').slice(0, 64));
  }
  function atobSafe(x) { return Buffer.from(x, 'base64'); }
  console.log('distinct art payloads among first', Math.min(ob.n, 8), 'frames:', distinct.size);

  // 4. does the object region change in the JS world over time? (worldCanvas is static bake,
  //    animated objects are drawn per-frame only in draw(), so world stays constant -> expected)
  const before = T.renderWorld();
  for (let t = 0; t < 30; t++) T.stepSim(T.state.level);
  const after = T.renderWorld();
  let diff = 0;
  for (let i = 0; i < before.rgb.length; i++) if (before.rgb[i] !== after.rgb[i]) diff++;
  console.log('renderWorld pixel diffs after 30 ticks:', diff, '(animated objs are NOT in this buffer by design)');
}
