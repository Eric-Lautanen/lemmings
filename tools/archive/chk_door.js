const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
function b64d(s) { return new Uint8Array(Buffer.from(s, 'base64')); }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } return px; }
function unpack1(d, w, h) { var px = new Uint8Array(w * h); var rb = (w + 7) >> 3; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) px[y * w + x] = (d[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1; return px; }
const o = A.gfx[0].objects[1];
console.log('entrance: w' + o.w + ' h' + o.h + ' n' + o.n + ' s' + o.s + ' a' + o.a);
for (const fi of [0, 1, 2, 3, 9]) {
  const img = unpack4(b64d(o.f[fi][0]), o.w, o.h);
  const mask = unpack1(b64d(o.f[fi][1]), o.w, o.h);
  console.log('--- frame ' + fi + ' ---');
  for (let y = 0; y < o.h; y += 1) {
    let s = '';
    for (let x = 0; x < o.w; x += 1) s += mask[y * o.w + x] ? (img[y * o.w + x] ? '#' : 'o') : ' ';
    console.log(s);
  }
}