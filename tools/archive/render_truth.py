import numpy as np, json, base64, itertools
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lv = assets['levels'][78]
g3 = assets['gfx'][3]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w * h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2 * i] = (b >> 4) & 0xF
        if 2 * i + 1 < w * h: px[2 * i + 1] = b & 0xF
    return px.reshape(h, w)

tiles = {}
for i, t in enumerate(g3['terrains']):
    if t is None: tiles[i] = None; continue
    px = unpack_px(t['d'], t['w'], t['h'])
    col = px & 0x7
    msk = (px >> 3) & 1
    tiles[i] = ((col != 0) & (msk == 1)).astype(np.uint8)  # DOS drawn mask

# ---- frame 0 GIF truth profile (world 505..800) ----
im0 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a.gif')
im0.seek(0)
im = np.array(im0.convert('RGB')).astype(int)
H, W, _ = im.shape
ph = int(round(H*160/200))
bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
t = ~(bg1 | bg2 | (im.max(axis=2)<30))
t[ph:,:] = False
sx = W/320.0
x0 = 489
# map gif cols to world cols (with 0.5 rounding) -> per-world-cell vote
cols = (x0 + np.arange(W)/sx)
gif_truth = np.zeros(1600, dtype=np.int8)  # -1 unknown, 0 void, 1 solid
for y in range(160):
    g = int(round(y*1.39375))
    if g >= ph: continue
    row = t[g]
    # world col c is covered by gif pixels floor/ceil of (c-x0)*sx
    for c in range(505, 800):
        lo = (c - x0) * sx; hi = (c + 1 - x0) * sx
        lo_i = int(np.ceil(lo)); hi_i = int(np.floor(hi - 1e-9))
        if hi_i < lo_i: continue
        seg = row[max(0, lo_i):min(W, hi_i + 1)]
        if len(seg) == 0: continue
        frac = seg.sum() / len(seg)
        gif_truth[c] = 1 if frac >= 0.6 else (0 if frac <= 0.4 else -1)

def render(variant, order, up_ext):
    upb, erb, owb = variant
    pieces = list(enumerate(lv['terrain']))
    if order == 'rev': pieces = pieces[::-1]
    solid = np.zeros((160, 1600), dtype=np.uint8)
    for idx, (x, mods, y, tid) in pieces:
        t = tiles[tid]
        if t is None: continue
        h, w = t.shape
        y = int(round(y))
        up = bool(mods & (1 << upb)); erase = bool(mods & (1 << erb)); noow = bool(mods & (1 << owb))
        y0 = y - h + 1 if (up and up_ext) else y
        for yy in range(h):
            sy = h - 1 - yy if (up and not up_ext) else yy
            ly = y0 + yy
            if ly < 0 or ly >= 160: continue
            for xx in range(w):
                if t[sy, xx] == 0: continue
                lx = x + xx
                if lx < 0 or lx >= 1600: continue
                if erase: solid[ly, lx] = 0
                elif noow and solid[ly, lx]: continue
                else: solid[ly, lx] = 1
    return solid

results = []
for upb, erb, owb, order, up_ext in itertools.product([0,1,2], [0,1,2], [0,1,2], ['fwd','rev'], [False, True]):
    if len({upb, erb, owb}) != 3: continue
    s = render((upb, erb, owb), order, up_ext)
    mis = 0; known = 0
    for y in range(160):
        for c in range(505, 800):
            gt = gif_truth[c]
            if gt < 0: continue
            known += 1
            if s[y, c] != gt: mis += 1
    results.append((mis, f'up={upb} erase={erb} noow={owb} {order} up_ext={up_ext}'))
results.sort()
print('known cells per row-window:', known)
for mis, label in results[:10]:
    print(f'{mis:5d}  {label}')

best = results[0]
print('\nWINNER:', best[1], best[0])
np.save(r'C:\github\Lemmings\truth_fun3.npy', render((0,1,2), 'fwd', False))