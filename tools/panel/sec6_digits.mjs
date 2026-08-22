import fs from 'fs';
const src = fs.readFileSync('web/assets.js', 'utf8');
const start = src.indexOf('{');
const end = src.lastIndexOf('}');
const obj = JSON.parse(src.slice(start, end + 1));
const font = obj.main.font;
function decode(b64) {
  const buf = Buffer.from(b64, 'base64');
  const px = new Array(128).fill(0);
  for (let p = 0; p < 3; p++) {
    const plane = buf.subarray(p * 16, (p + 1) * 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        if (plane[y] & (1 << (7 - x))) px[y * 8 + x] |= 1 << p;
      }
    }
  }
  return px;
}
for (const ch of ['0', '1', '5', '8', '%']) {
  const px = decode(font[ch]);
  console.log('sec6 glyph', JSON.stringify(ch));
  for (let y = 0; y < 16; y++) {
    console.log('  ' + String(y).padStart(2), px.slice(y * 8, y * 8 + 8).map(v => v ? (v === 1 ? 'G' : 'W') : '.').join(''));
  }
}