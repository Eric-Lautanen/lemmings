const fs = require('fs');
const zlib = require('zlib');
function decodePNG(buf) {
  let pos = 8, w = 0, h = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') { w = buf.readUInt32BE(pos + 8); h = buf.readUInt32BE(pos + 12); colorType = buf[pos + 17]; }
    else if (type === 'IDAT') idat.push(buf.slice(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 3);
  let prev = Buffer.alloc(stride);
  let src = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[src++];
    const line = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      let v = raw[src + x];
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
      line[x] = v;
    }
    prev = line;
    src += stride;
    for (let x = 0; x < w; x++) {
      const i = x * bpp;
      out[(y * w + x) * 3] = line[i]; out[(y * w + x) * 3 + 1] = line[i + 1]; out[(y * w + x) * 3 + 2] = line[i + 2];
    }
  }
  return { w, h, rgb: out };
}
const png = decodePNG(fs.readFileSync('C:/github/Lemmings/build/ref/sshot3_dosdays_fun1.png'));
const { w, h, rgb } = png;
console.log('img', w, 'x', h);
// full row profile, coarse: % non-black per 8-row band
for (let y0 = 0; y0 < h; y0 += 8) {
  let n = 0;
  for (let y = y0; y < Math.min(y0 + 8, h); y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    if (rgb[i] + rgb[i+1] + rgb[i+2] > 12) n++;
  }
  console.log('rows ' + String(y0).padStart(3) + '..' + String(y0+7).padStart(3) + ' nonblack ' + (100 * n / (8 * w)).toFixed(1) + '%');
}