const fs = require('fs');
global.window = {};
eval(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'));
const anims = global.window.GAME_ASSETS.main.anims;

function b64d(s) { return new Uint8Array(Buffer.from(s, 'base64')); }
function unpackPlane(d, w, h, bpp) {
  const px = new Uint8Array(w * h);
  const rb = (w + 7) >> 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let p = 0; p < bpp; p++) if (d[p * rb * h + y * rb + (x >> 3)] & (0x80 >> (x & 7))) v |= 1 << p;
    px[y * w + x] = v;
  }
  return px;
}
function mirror(px, w, h) { const q = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) q[y * w + x] = px[y * w + (w - 1 - x)]; return q; }

function showPose(name, k) {
  const a = anims[name];
  const px = unpackPlane(b64d(a.f[k]), a.w, a.h, a.bpp);
  console.log(`--- ${name} f${k} (silhouette) ---`);
  for (let y = 0; y < a.h; y++) {
    let s = '';
    for (let x = 0; x < a.w; x++) s += px[y * a.w + x] ? '#' : '.';
    console.log(s);
  }
  console.log();
}

for (const [r, l] of [['walk_r', 'walk_l'], ['build_r', 'build_l'], ['fall_r', 'fall_l'], ['climb_r', 'climb_l'], ['bash_r', 'bash_l'], ['mine_r', 'mine_l'], ['shrug_r', 'shrug_l']]) {
  const a = anims[r], b = anims[l];
  const pr = mirror(unpackPlane(b64d(a.f[0]), a.w, a.h, a.bpp), a.w, a.h);
  const pl = unpackPlane(b64d(b.f[0]), b.w, b.h, b.bpp);
  const p0 = unpackPlane(b64d(a.f[0]), a.w, a.h, a.bpp);
  console.log(`=== ${r} f0 mirrored | ${l} f0 | ${r} f0 direct ===`);
  for (let y = 0; y < a.h; y++) {
    let s = '';
    for (let x = 0; x < a.w; x++) s += pr[y * a.w + x] ? '#' : '.';
    let t = '';
    for (let x = 0; x < a.w; x++) t += pl[y * a.w + x] ? '#' : '.';
    let u = '';
    for (let x = 0; x < a.w; x++) u += p0[y * a.w + x] ? '#' : '.';
    console.log(s + '   ' + t + '   ' + u);
  }
  console.log();
}
