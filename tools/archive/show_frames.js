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
function show(name) {
  const a = anims[name];
  const px = unpackPlane(b64d(a.f[0]), a.w, a.h, a.bpp);
  console.log(`--- ${name} (${a.w}x${a.h}) f0 ---`);
  for (let y = 0; y < a.h; y++) {
    let s = '';
    for (let x = 0; x < a.w; x++) s += px[y * a.w + x] ? '#' : '.';
    console.log(s);
  }
  console.log();
}
show('walk_r');
show('walk_l');
show('climb_r');
show('climb_l');
show('mine_r');
show('mine_l');
show('build_r');
show('build_l');
show('fall_r');
show('fall_l');
show('bash_r');
show('bash_l');
