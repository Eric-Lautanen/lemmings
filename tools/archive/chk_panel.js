const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;

// decode panel like game.js does
function b64d(s) { var b = Buffer.from(s, 'base64'); var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b[i]; return u; }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } return px; }

const FIXED = [[0,0,0],[16,16,56],[0,44,0],[60,52,52],[60,60,0],[60,8,8],[32,32,32]];
const g0 = A.gfx[0];
// panel uses gfxset of level; use palette from gfx 0 (panel is same across)
function levelPalette(custom) { var p = FIXED.slice(); p.push(custom[0]); for (var i = 0; i < 8; i++) p.push(custom[i]); return p; }
const pal = levelPalette(g0.pc);

const pan = unpack4(b64d(A.main.panel), 320, 40);
// find "black holes/dark digit wells": list runs of dark pixels (exact palette idx 0 = pure black)
const wells = [];
for (let y = 0; y < 40; y++) {
  for (let x = 0; x < 320; x++) {
    const v = pan[y * 320 + x];
    if (v === 0) {
      // start of a dark run
      let x2 = x;
      while (x2 < 320 && pan[y * 320 + x2] === 0) x2++;
      // filter tiny noise
      if (x2 - x >= 4) wells.push([x, y, x2 - x]);
      x = x2;
    }
  }
}
// print only wells at least 6px tall vertical? simpler: print grid summary
// map non-zero palette entries
const rows = [];
for (let y = 0; y < 40; y += 4) {
  const row = [];
  for (let x = 0; x < 320; x += 4) {
    let maxv = 1;
    for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
      const v = pan[(y + dy) * 320 + x + dx];
      if (v > maxv) maxv = v;
    }
    row.push(maxv === 1 ? ' ' : (maxv <= 9 ? String(maxv) : '#'));
  }
  rows.push(row.join(''));
}
console.log(rows.join('\n'));
// also the digit bitmap size (8x8) - list wells >= 7px wide
console.log('\nwells (x,y,width):');
wells.filter(w => w[2] >= 6).forEach(w => console.log(w.join(',')));
