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
function sil(px) { return px.map(v => v ? 1 : 0); }
function sim(a, b) { let m = 0, n = 0; for (let i = 0; i < a.length; i++) { if (a[i] || b[i]) n++; if (a[i] && a[i] === b[i]) m++; } return n ? m / n : 0; }

function bestShift(rName, lName, n) {
  const a = anims[rName], b = anims[lName];
  const framesA = a.f.map(f => sil(unpackPlane(b64d(f), a.w, a.h, a.bpp)));
  const framesB = b.f.map(f => sil(unpackPlane(b64d(f), b.w, b.h, b.bpp)));
  let best = { s: -1 };
  for (let off = 0; off < n; off++) {
    let total = 0, cnt = 0;
    for (let k = 0; k < n; k++) {
      const fr = framesB[k], fl = framesA[(k + off) % n];
      total += sim(fr, mirror(fl, a.w, a.h));
      cnt++;
    }
    const s = total / cnt;
    if (s > best.s) best = { s, off };
  }
  return best;
}

console.log('silhouette sim of _l[k] vs mirror(_r[k+off]), best over cycle offset:');
for (const [r, l, n] of [['walk_r', 'walk_l', 8], ['climb_r', 'climb_l', 8], ['build_r', 'build_l', 16], ['bash_r', 'bash_l', 32], ['mine_r', 'mine_l', 24], ['fall_r', 'fall_l', 4]]) {
  const best = bestShift(r, l, n);
  // compare also against unmirrored _r for reference
  const a = anims[r], b = anims[l];
  const fA = a.f.map(f => sil(unpackPlane(b64d(f), a.w, a.h, a.bpp)));
  const fB = b.f.map(f => sil(unpackPlane(b64d(f), b.w, b.h, b.bpp)));
  let direct = 0;
  for (let k = 0; k < n; k++) direct += sim(fB[k], fA[k]);
  direct /= n;
  console.log(`${r}/${l}: bestMirrorSim=${best.s.toFixed(3)} (offset ${best.off})   directSim(_l,_r)=${direct.toFixed(3)}`);
}
