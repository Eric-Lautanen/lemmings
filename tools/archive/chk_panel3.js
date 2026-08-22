const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
function b64d(s) { var b = Buffer.from(s, 'base64'); var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b[i]; return u; }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } return px; }
const pan = unpack4(b64d(A.main.panel), 320, 40);
function dump(x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y++) {
    let s = '';
    for (let x = x0; x <= x1; x++) s += pan[y * 320 + x] ? '#' : '.';
    console.log(String(y).padStart(2) + ' ' + s);
  }
}
console.log('-- skill buttons row (x=0..159, y=15..27) --');
dump(0, 159, 15, 27);
console.log('-- OUT/rescue/time area (x=150..319, y=28..39) --');
dump(150, 319, 28, 39);