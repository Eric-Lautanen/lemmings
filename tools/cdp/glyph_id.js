// Identify the 5 countdown glyphs at s1@0x154 by rendering ASCII + comparing
// against known hud digit glyphs (R variant) from s2@0x1900.
'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('assets.js', 'utf8'));
const A = window.GAME_ASSETS;

function b64d(s) { return Buffer.from(s, 'base64'); }
function unpack1(d, w, h) {
  const px = new Uint8Array(w * h);
  const rb = (w + 7) >> 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    px[y * w + x] = (d[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1;
  return px;
}
function ascii(g, w, h) {
  const out = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) row += g[y * w + x] ? '#' : '.';
    out.push(row);
  }
  return out.join('\n');
}

// access raw section1 via decodeB64-equivalent: rebuild from bundle? The bundle
// doesn't expose raw sections; instead use the hud font (sec2@0x1900) as reference
// and pull countdown from main.countdown (extracted from s1@0x154 in build_bundle).
console.log('A.main.countdown present:', Array.isArray(A.main.countdown), A.main.countdown.length);
for (let f = 0; f < A.main.countdown.length; f++) {
  const g = unpack1(b64d(A.main.countdown[f]), 8, 8);
  console.log(`--- countdown[${f}] ---`);
  console.log(ascii(g, 8, 8));
}

// reference: hud digits (R variant = even indices)
console.log('=== hud reference (R variants) ===');
for (let d = 0; d <= 5; d++) {
  const g = unpack1(b64d(A.main.hud[d * 2]), 8, 8);
  console.log(`--- digit ${d} ---`);
  console.log(ascii(g, 8, 8));
}
