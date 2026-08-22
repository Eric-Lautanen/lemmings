import os, sys, json, subprocess
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat
from parse_lvl import parse_level
from datcommon import ORIG
import numpy as np

# ---- build terrain art (64x34 t0 and others) ----
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
  const trns = chunks.find(c => c.type === 'tRNS');
  const palette = [];
  if (plte) for (let i = 0; i < plte.data.length / 3; i++) palette.push([plte.data[i*3], plte.data[i*3+1], plte.data[i*3+2]]);
  const raw = zlib.inflateSync(chunks.find(c => c.type === 'IDAT').data);
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
    prev = cur;
  }
  return { w, h, px };
}
const out = {};
for (const id of ['0','1','4','5','8','9','23','25','29','35','36','37','38','44']) {
  const img = readPNG('C:/Users/ericl/AppData/Local/Temp/opencode/lemtools/png/gr3_terr' + id + '.png');
  const solid = [];
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) solid.push(img.px[y*img.w+x] > 0 ? 1 : 0);
  out[id] = { w: img.w, h: img.h, solid };
}
console.log(JSON.stringify(out));
'''
res = subprocess.run(['node', '-e', JS], capture_output=True, text=True)
arts = json.loads(res.stdout)

# check which other tids are needed
lv = parse_level(os.path.join(ORIG, 'level009.dat'), 6)
tids = sorted(set(t[3] for t in lv['terrains']))
print('tids used:', tids)
for t in tids:
    if str(t) not in arts:
        print('MISSING ART for tid', t)

W, H = 1600, 160
# render candidate
def render(xoff, up_flip, up_invisible, yoff=0):
    solid = np.zeros((H, W), dtype=np.uint8)
    color = np.zeros((H, W), dtype=np.uint8)
    for (px, mods, py, tid) in lv['terrains']:
        a = arts.get(str(tid))
        if not a: continue
        tw, th = a['w'], a['h']
        erase = bool(mods & 1)
        up = bool(mods & 2)
        if up and up_invisible:
            continue
        for yy in range(th):
            ly = py + yoff + (th - 1 - yy if up_flip else yy)
            if ly < 0 or ly >= H: continue
            for xx in range(tw):
                if not a['solid'][yy * tw + xx]: continue
                lx = px + xoff + xx
                if lx < 0 or lx >= W: continue
                if erase:
                    solid[ly, lx] = 0
                else:
                    solid[ly, lx] = 1
                    color[ly, lx] = 1
    return solid

# DOS ground truth
from PIL import Image
im = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3_dos.png').convert('RGB')).astype(int)
bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
dark = im.max(axis=2) < 25
terrain = ~(bg1 | bg2 | dark)
# exclude lemmings by color: blue (64,64,224), gray (64,64,80)/(96,96,112), red-white?, green
lem = np.zeros_like(terrain)
for col in [(64,64,224),(96,96,112),(64,64,80),(240,240,96)]:
    lem |= (im[:,:,0]==col[0])&(im[:,:,1]==col[1])&(im[:,:,2]==col[2])
# hmm - (240,240,96) is a terrain highlight color... exclude only tiny-colored stuff via label sizes instead:
truth = terrain & ~lem
print('truth px', truth.sum())

x0 = 489
def win(solid):
    return solid[:, x0:x0+im.shape[1]]

best = None
for xoff in [14, 15, 16]:
    for upf in [False, True]:
        for upi in [False, True]:
            sol = render(xoff, upf, upi)
            w = win(sol)
            inter = np.logical_and(w, truth).sum()
            union = np.logical_or(w, truth).sum()
            score = inter / union if union else 0
            print(f'xoff={xoff} up_flip={upf} up_inv={upi}: IoU={score:.4f} inter={inter} union={union}')
            if best is None or score > best[0]:
                best = (score, xoff, upf, upi)
print('BEST', best)