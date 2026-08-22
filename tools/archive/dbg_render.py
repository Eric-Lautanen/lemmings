import os, sys, json, subprocess
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat
from parse_lvl import parse_level
from datcommon import ORIG
import numpy as np

JS = r'''
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
  const plte = chunks.find(c => c.type === 'PLTE');
  const raw = zlib.inflateSync(chunks.find(c => c.type === 'IDAT').data);
  const palette = [];
  if (plte) for (let i = 0; i < plte.data.length / 3; i++) palette.push([plte.data[i*3], plte.data[i*3+1], plte.data[i*3+2]]);
  const px = Buffer.alloc(w * h * 4);
  let p = 0; let prev = Buffer.alloc(w);
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const bpr = Math.ceil(w * 8 / 8);
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
const out = {};
for (const id of ['0','1','4','5','8','9','23','25','29','35','36','37','38','44']) {
  const img = readPNG('C:/Users/ericl/AppData/Local/Temp/opencode/lemtools/png/gr3_terr' + id + '.png');
  let n = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.px[(y*img.w+x)*4] > 0) n++;
  out[id] = { w: img.w, h: img.h, solid: n };
}
console.log(JSON.stringify(out));
'''
res = subprocess.run(['node', '-e', JS], capture_output=True, text=True)
print('node rc', res.returncode)
print('stderr:', res.stderr[:500])
arts = json.loads(res.stdout)
for k, v in arts.items():
    print(k, v)

lv = parse_level(os.path.join(ORIG, 'level009.dat'), 6)
W, H = 1600, 160
solid = np.zeros((H, W), dtype=np.uint8)
for (px, mods, py, tid) in lv['terrains']:
    a = arts.get(str(tid))
    if not a: continue
    tw, th = a['w'], a['h']
    print('piece', px, py, 'mods', mods, 'tid', tid, 'art', tw, th)
    break
# print row 153-158 of the render with the floor pieces
for (px, mods, py, tid) in lv['terrains']:
    if mods == 0 and py >= 140 and tid == 0:
        print('floor piece x', px, 'y', py)
print('render rows 153..159 with xoff=15:')
for yy in range(153, 160):
    row = solid[yy]
    runs = []
    inr = False
    for x in range(400, 1000):
        if row[x] and not inr: s = x; inr = True
        elif not row[x] and inr: runs.append((s, x-1)); inr = False
    if inr: runs.append((s, 999))
    print(yy, runs)