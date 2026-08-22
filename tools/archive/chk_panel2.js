const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;

function b64d(s) { var b = Buffer.from(s, 'base64'); var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b[i]; return u; }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } return px; }
const FIXED = [[0,0,0],[16,16,56],[0,44,0],[60,52,52],[60,60,0],[60,8,8],[32,32,32]];
const pal = (c => { var p = FIXED.slice(); p.push(c[0]); for (var i = 0; i < 8; i++) p.push(c[i]); return p; })(A.gfx[0].pc);

const pan = unpack4(b64d(A.main.panel), 320, 40);
const S = 4;
const w = 320 * S, h = 40 * S;
const png = Buffer.alloc(1); // placeholder
// raw PPM (easy to decode myself? no) -> write BMP
function writeBMP(path, w, h, rgb) {
  const row = w * 3, pad = (4 - (row % 4)) % 4;
  const fileSize = 54 + (row + pad) * h;
  const b = Buffer.alloc(fileSize);
  b.write('BM'); b.writeUInt32LE(fileSize, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(w, 18); b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28);
  b.writeUInt32LE((row + pad) * h, 34);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = rgb[(y * w + x) * 3];
      b[54 + (h - 1 - y) * (row + pad) + x * 3] = rgb[(y * w + x) * 3 + 2];
      b[54 + (h - 1 - y) * (row + pad) + x * 3 + 1] = rgb[(y * w + x) * 3 + 1];
      b[54 + (h - 1 - y) * (row + pad) + x * 3 + 2] = v;
    }
  }
  fs.writeFileSync(path, b);
}
const rgb = new Uint8Array(w * h * 3);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const v = pan[Math.floor(y / S) * 320 + Math.floor(x / S)];
  const c = v ? pal[v] : [0, 0, 0];
  rgb[(y * w + x) * 3] = c[0]; rgb[(y * w + x) * 3 + 1] = c[1]; rgb[(y * w + x) * 3 + 2] = c[2];
}
writeBMP('C:\\Users\\ericl\\AppData\\Local\\Temp\\opencode\\panel.bmp', w, h, rgb);
console.log('wrote panel.bmp', w, 'x', h);