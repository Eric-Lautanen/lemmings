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
function mirror(px, w, h) {
  const q = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) q[y * w + x] = px[y * w + (w - 1 - x)];
  return q;
}
function sim(a, b) { let m = 0, n = 0; for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) n++; if (a[i] && a[i] === b[i]) m++; } return n ? m / n : 1; }
function sil(a) { return a.map(v => v ? 1 : 0); }

for (const [r, l] of [['walk_r', 'walk_l'], ['climb_r', 'climb_l'], ['build_r', 'build_l'], ['bash_r', 'bash_l'], ['mine_r', 'mine_l'], ['fall_r', 'fall_l'], ['umbrella_r', 'umbrella_l'], ['shrug_r', 'shrug_l']]) {
  const a = anims[r], b = anims[l];
  if (!a || !b) { console.log(`${r}/${l}: MISSING`); continue; }
  const f0a = unpackPlane(b64d(a.f[0]), a.w, a.h, a.bpp);
  const f0b = unpackPlane(b64d(b.f[0]), b.w, b.h, b.bpp);
  console.log(`${r} vs ${l} f0: valueSim(l, mirror(r))=${sim(f0b, mirror(f0a, a.w, a.h)).toFixed(3)}  valueSim(l, r)=${sim(f0b, f0a).toFixed(3)}  silSim(l, mirror(r))=${sim(sil(f0b), sil(mirror(f0a, a.w, a.h))).toFixed(3)}  silSim(l, r)=${sim(sil(f0b), sil(f0a)).toFixed(3)}`);
}
