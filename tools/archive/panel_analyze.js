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

const ROOT = 'C:/github/Lemmings';
const png = decodePNG(fs.readFileSync(ROOT + '/build/ref/sshot3_dosdays_fun1.png'));
const { w, h, rgb } = png;
const getPx = (gx, gy) => {
  if (gy < 160) return null;
  const sx = gx * 2, sy = gy * 2;
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const X = sx + dx, Y = sy + dy;
    if (X < w && Y < h) { const i = (Y * w + X) * 3; r += rgb[i]; g += rgb[i + 1]; b += rgb[i + 2]; n++; }
  }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null;
};

const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(ROOT + '/build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = global.window.GAME_ASSETS;
const custom = A.gfx['0'].pc;
const FIXED = [[0,0,0],[16,16,56],[0,44,0],[60,52,52],[60,60,0],[60,8,8],[32,32,32]];
const MAIN_PAL = [[0,0,0],[128,64,32],[96,48,32],[48,0,16],[32,8,124],[64,44,144],[104,88,164],[152,140,188],[0,80,0],[0,96,16],[0,112,32],[0,128,64],[208,208,208],[176,176,0],[64,80,176],[224,128,144]];

const cands = {
  main: MAIN_PAL,
  fixedLevelGfx0: FIXED.concat([custom[0]]).concat(custom),
};

// classify every panel pixel in the shot against each palette
function classify(px, pal, tol) {
  let best = -1, bestD = 1e9;
  for (let i = 0; i < pal.length; i++) {
    const d = Math.abs(px[0]-pal[i][0]) + Math.abs(px[1]-pal[i][1]) + Math.abs(px[2]-pal[i][2]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return bestD <= tol ? best : -1;
}

for (const [name, pal] of Object.entries(cands)) {
  // sample points across the panel: button column x1..x16 at y16..38, minimap, rate box
  let hits = 0, total = 0, gross = 0, grossTotal = 0;
  const maxDev = { c: 0, p: null };
  // sample a sparse grid over the whole panel
  for (let y = 16; y < 40; y += 2) for (let x = 0; x < 160; x += 2) {
    const px = getPx(x, y);
    if (!px) continue;
    if (px[0] === 0 && px[1] === 0 && px[2] === 0) continue; // skip black
    const idx = classify(px, pal, 12);
    if (idx >= 0) { hits++; total++; }
    else { gross++; grossTotal++; const d = Math.abs(px[0]-pal[classify(px,pal,1e9)][0])+Math.abs(px[1]-pal[classify(px,pal,1e9)][1])+Math.abs(px[2]-pal[classify(px,pal,1e9)][2]); if (d > maxDev.c) maxDev = { c: d, p: px }; }
  }
  console.log(name + ': classified ' + hits + '/' + total + ' (' + (100*hits/Math.max(1,total)).toFixed(1) + '%) nonblack-to-sample=' + total + '/' + (total+grossTotal) + ' maxDev=' + maxDev.c + ' at ' + JSON.stringify(maxDev.p));
}