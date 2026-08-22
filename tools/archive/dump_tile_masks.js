const fs = require('fs');
const vm = require('vm');
const ctx = { window: {}, console, Math, Uint8Array, Uint16Array, Int16Array, ArrayBuffer, atob: (s) => Buffer.from(s, 'base64').toString('binary') };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), ctx);
const t = ctx.window.GAME_ASSETS.gfx['3'].terrains;
function b64d(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) { for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } } return px; }
for (const idx of [0, 4, 5, 23, 25, 35]) {
  const tr = t[idx];
  const px = unpack4(b64d(tr.d), tr.w, tr.h);
  console.log('TILE ' + idx + ' w=' + tr.w + ' h=' + tr.h);
  for (let y = 0; y < tr.h; y++) {
    let s = [];
    let i = 0;
    while (i < tr.w) {
      if (px[y * tr.w + i]) { let j = i; while (j < tr.w && px[y * tr.w + j]) j++; s.push(i + '-' + (j - 1)); i = j; }
      else i++;
    }
    console.log('  y' + y + ': ' + (s.join(',') || 'e'));
  }
}
