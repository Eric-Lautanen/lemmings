// Inspect ADLIB.DAT driver memory: tune table + any embedded titles
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', '..', 'web', 'adlib_data.js'), 'utf8'));
const img = Buffer.from(window.ADLIB_DRIVER_B64, 'base64');
console.log('image size:', img.length);

const w = (a) => img[a] | (img[a + 1] << 8);

// tunes list @0xB6C: [word junk][N x word ptr]
for (let t = 1; t <= 22; t++) {
  const p = w(0xB6C + t * 2);
  if (!p) { console.log(`tune ${t}: null`); continue; }
  // tune header: word misc, word voiceBase(rel), byte tempo, byte chCount, then section words...
  const tempo = img[p + 4];
  const chCount = img[p + 5];
  // read a few bytes after header start as "name-ish" ascii
  let asc = '';
  for (let i = 0; i < 24; i++) {
    const c = img[p + 6 + i];
    asc += c >= 0x20 && c < 0x7f ? String.fromCharCode(c) : '.';
  }
  console.log(`tune ${t}: hdr=0x${p.toString(16)} tempo=${tempo} ch=${chCount} bytes="${asc}"`);
}

// scan whole image for printable ASCII strings >= 6 chars
console.log('\n--- embedded strings ---');
let cur = '';
const strs = [];
for (let i = 0; i < img.length; i++) {
  const c = img[i];
  if (c >= 0x20 && c < 0x7f) cur += String.fromCharCode(c);
  else { if (cur.length >= 8) strs.push([i - cur.length, cur]); cur = ''; }
}
for (const [off, s] of strs) console.log(`0x${off.toString(16)}: ${s}`);
