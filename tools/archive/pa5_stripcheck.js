'use strict';
// replicate the new game.js strip layout from A.main.font and dump a mask
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;

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
const digs = {};
for (const k in A.main.font) digs[k] = unpackPlane(new Uint8Array(Buffer.from(A.main.font[k], 'base64')), 8, 16, 3);

const strip = [];
for (let y = 0; y < 16; y++) strip.push(new Array(320).fill(0));
function putChar(x, ch) {
  const d = digs[ch];
  if (!d) { console.log('MISSING GLYPH', ch); return; }
  for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 8; xx++) if (d[yy * 8 + xx]) strip[yy][x + xx] = 1;
}
function word(x, s) { for (let i = 0; i < s.length; i++) putChar(x + i * 8, s[i]); }
function numL(x, n, w) { const s = String(Math.max(0, n)).slice(0, w); for (let i = 0; i < s.length; i++) putChar(x + i * 8, s[i]); }
function numR(x, n, w) { const s = String(Math.max(0, n)).slice(0, w); for (let i = 0; i < s.length; i++) putChar(x - (s.length - 1 - i) * 8, s[i]); }

const released = 9, rescued = 0, timeLeft = 4 * 60 + 43;
word(112, 'OUT');
word(184, 'IN');
word(248, 'TIME');
numL(144, released, 2);
const pct = Math.max(0, Math.round(rescued / Math.max(1, released) * 100));
word(224, '%');
if (pct >= 100) { word(208, '100'); word(232, '%'); }
else numR(216, pct, 2);
const mm = Math.floor(timeLeft / 60), ss = Math.floor(timeLeft % 60);
numR(288, mm, 1);
word(296, '-');
numR(312, ss, 2);

const out = [];
for (let y = 0; y < 16; y++) out.push(strip[y].join(''));
fs.writeFileSync('C:/Users/ericl/AppData/Local/Temp/opencode/pa5_stripmask.txt', out.join('\n'));
console.log('strip mask dumped; chars used:', Object.keys(digs).length);
