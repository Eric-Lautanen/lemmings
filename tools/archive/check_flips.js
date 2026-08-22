const fs = require('fs');
global.window = {};
eval(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'));
const anims = global.window.GAME_ASSETS.main.anims;

function b64d(s) { const b = Buffer.from(s, 'base64'); return new Uint8Array(b); }
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
function same(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

for (const [r, l] of [['walk_r', 'walk_l'], ['climb_r', 'climb_l'], ['build_r', 'build_l'], ['bash_r', 'bash_l'], ['mine_r', 'mine_l']]) {
  if (!anims[r] || !anims[l]) { console.log(`${r}/${l}: MISSING`); continue; }
  const a = anims[r], b = anims[l];
  console.log(`--- ${r} vs ${l} (${a.w}x${a.h}, ${a.f.length} frames)`);
  let any = false;
  for (let i = 0; i < Math.max(a.f.length, b.f.length); i++) {
    const fa = unpackPlane(b64d(a.f[i]), a.w, a.h, a.bpp);
    const fb = unpackPlane(b64d(b.f[i]), b.w, b.h, b.bpp);
    const isMirror = same(fb, mirror(fa, a.w, a.h));
    const isSame = same(fa, fb);
    if (i < 2 || !isMirror || !isSame) {
      console.log(`  f${i}: same=${isSame} mirrorOf_r=${isMirror}`);
      any = true;
    }
  }
  if (!any) console.log('  all frames mirror correctly');
}