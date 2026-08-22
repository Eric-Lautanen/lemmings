const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
function b64d(s) { var b = Buffer.from(s, 'base64'); var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b[i]; return u; }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } return px; }
const pan = unpack4(b64d(A.main.panel), 320, 40);
// print wells (pure dark 0 runs) in rows 28..38 over x=156..215 with run start/end
for (let y = 28; y <= 38; y++) {
  let runs = [], x = 156;
  while (x <= 215) {
    if (pan[y * 320 + x] === 0) {
      let x2 = x; while (x2 <= 215 && pan[y * 320 + x2] === 0) x2++;
      runs.push(x + '-' + (x2 - 1));
      x = x2;
    } else x++;
  }
  console.log('y' + y + ':', runs.join(', '));
}