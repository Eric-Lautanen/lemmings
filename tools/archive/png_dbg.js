const fs = require('fs');
const zlib = require('zlib');
function readPNG(file) {
  const buf = fs.readFileSync(file);
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    chunks.push({ type, data: buf.slice(off + 8, off + 8 + len) });
    off += 12 + len;
  }
  const ihdr = chunks.find(c => c.type === 'IHDR').data;
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  console.log('w,h', w, h, 'chunks', chunks.map(c => c.type).join(','));
  const plte = chunks.find(c => c.type === 'PLTE');
  console.log('plte pixels:', plte ? plte.data.length / 3 : 'NONE');
  const raw = zlib.inflateSync(chunks.find(c => c.type === 'IDAT').data);
  const palette = [];
  if (plte) for (let i = 0; i < plte.data.length / 3; i++) palette.push([plte.data[i*3], plte.data[i*3+1], plte.data[i*3+2]]);
  const px = Buffer.alloc(w * h * 4);
  let p = 0; let prev = Buffer.alloc(w);
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const bpr = w;
    const line = raw.slice(p, p + bpr); p += bpr;
    const cur = Buffer.alloc(w);
    for (let i = 0; i < bpr; i++) {
      const a = i >= 1 ? cur[i - 1] : 0;
      const b = prev[i];
      const c = i >= 1 ? prev[i - 1] : 0;
      let v = line[i];
      if (filter === 1) v = (v + a) & 0xFF;
      else if (filter === 2) v = (v + b) & 0xFF;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xFF;
      else if (filter === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF; }
      cur[i] = v;
    }
    for (let x = 0; x < w; x++) {
      const col = palette[cur[x]] || [0, 0, 0];
      px[(y * w + x) * 4] = col[0]; px[(y * w + x) * 4 + 1] = col[1]; px[(y * w + x) * 4 + 2] = col[2]; px[(y * w + x) * 4 + 3] = 255;
    }
    prev = cur;
  }
  return { w, h, px };
}
const img = readPNG('C:/Users/ericl/AppData/Local/Temp/opencode/lemtools/png/gr3_terr0.png');
console.log('first 5 pixels:', [...img.px.slice(0, 20)]);
let n = 0;
for (let i = 0; i < img.w * img.h; i++) if (img.px[i * 4] > 0) n++;
console.log('solid count', n);
let na = 0;
for (let i = 0; i < img.w * img.h; i++) if (img.px[i * 4 + 3] > 0) na++;
console.log('alpha count', na);