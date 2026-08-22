import numpy as np, json, base64, itertools, os
from PIL import Image

TGIF = r'C:\github\Lemmings\tools\capture\native'
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
    tiles[i] = unpack_px(t['d'], t['w'], t['h'])

objs_px = {}
for i, o in enumerate(g3['objects']):
    if o is None: objs_px[i] = None; continue
    img, msk = [base64.b64decode(x) for x in o['f'][0]]
    w, h = o['w'], o['h']
    im = np.zeros(w * h, dtype=np.uint8); mk = np.zeros(w * h, dtype=np.uint8)
    for j, b in enumerate(img):
        im[2 * j] = (b >> 4) & 0xF
        if 2 * j + 1 < w * h: im[2 * j + 1] = b & 0xF
    for j, b in enumerate(msk):
        for k in range(8):
            p = j * 8 + k
            if p < w * h and (b >> (7 - k)) & 1: mk[p] = 1
    objs_px[i] = (im.reshape(h, w), mk.reshape(h, w))

def draw(variant, order):
    upb, erb, owb = variant
    pieces = list(enumerate(lv['terrain']))
    if order == 'rev': pieces = pieces[::-1]
    solid = np.zeros((160, 1600), dtype=np.uint8)
    for idx, (x, mods, y, tid) in pieces:
        t = tiles[tid]
        if t is None or y is None: continue
        h, w = t.shape
        y = int(round(y))
        up = bool(mods & (1 << upb)); erase = bool(mods & (1 << erb)); noow = bool(mods & (1 << owb))
        for yy in range(h):
            sy = h - 1 - yy if up else yy
            ly = y + yy
            if ly < 0 or ly >= 160: continue
            for xx in range(w):
                if t[sy, xx] == 0: continue
                lx = x + xx
                if lx < 0 or lx >= 1600: continue
                if erase: solid[ly, lx] = 0
                elif noow and solid[ly, lx]: continue
                else: solid[ly, lx] = 1
    return solid

def drawn(solid):
    d = solid.copy()
    for (x, y, oid, mods, disp) in lv['objs']:
        op = objs_px.get(oid)
        if op is None: continue
        im, mk = op
        oh, ow = im.shape
        for yy in range(oh):
            ly = y + yy
            if ly < 0 or ly >= 160: continue
            for xx in range(ow):
                lx = x + xx
                if lx < 0 or lx >= 1600: continue
                if mk[yy, xx]: d[ly, lx] = 1
    return d

# ---------- clean GIF truth ----------
def terrain_mask(im):
    H, W, _ = im.shape
    im = im.astype(int)
    bg1 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==51)
    bg2 = (im[:,:,0]==0)&(im[:,:,1]==0)&(im[:,:,2]==0)
    dark = im.max(axis=2) < 30
    t = ~(bg1 | bg2 | dark)
    ph = int(round(H*160/200))
    t[ph:,:] = False
    return t, ph

def calibrate(im, ref):
    t, ph = terrain_mask(im)
    H, W, _ = im.shape
    sx = W/320.0; sy = ph/160.0
    r = np.arange(ph)
    wrows = np.clip((r/sy).astype(int), 0, 159)
    best = None
    for x0 in range(440, 560):
        wcols = np.clip((x0 + np.arange(W)/sx).astype(int), 0, 1599)
        win = ref[np.ix_(wrows, wcols)]
        inter = np.logical_and(win, t[:ph]).sum()
        union = np.logical_or(win, t[:ph]).sum()
        score = inter/union if union else 0
        if best is None or score > best[0]:
            best = (score, x0)
    return best[0], best[1], t, ph

port = np.zeros((160, 1600), dtype=np.uint8)
for (x, mods, y, tid) in lv['terrain']:
    t = tiles[tid]
    if t is None: continue
    h, w = t.shape
    y = int(round(y))
    for yy in range(h):
        ly = y + yy
        if ly < 0 or ly >= 160: continue
        for xx in range(w):
            if t[yy, xx] == 0: continue
            lx = x + xx
            if 0 <= lx < 1600: port[ly, lx] = 1

seen = np.zeros((160, 1600), dtype=np.uint16)
solidv = np.zeros((160, 1600), dtype=np.uint16)
nframes = 0
for gif, nf in [('fun3a.gif', 211), ('fun3b.gif', 146)]:
    im0 = Image.open(os.path.join(TGIF, gif))
    for i in range(0, nf, 2):
        im0.seek(i)
        im = np.array(im0.convert('RGB'))
        score, x0, t, ph = calibrate(im, port)
        if score < 0.20: continue
        H, W, _ = im.shape
        sx = W/320.0; sy = ph/160.0
        nframes += 1
        for yy in range(160):
            g = int(round(yy*sy))
            if g >= ph: continue
            cols = np.clip((x0 + np.arange(W)/sx).astype(int), 0, 1599)
            # accumulate per world cell: total pixels mapped and terrain pixels
            cnt = np.bincount(cols, weights=t[g].astype(int), minlength=1600)
            tot = np.bincount(cols, minlength=1600)
            nz = tot > 0
            seen[yy, nz] += 1
            solidv[yy, nz] += (cnt[nz] > 0).astype(np.uint16)
print('accepted frames:', nframes)
valid = seen >= 3
frac = np.where(valid, solidv / np.maximum(seen, 1), 0.5)
truth = np.zeros((160, 1600), dtype=np.int8)
truth[valid & (frac >= 0.6)] = 1
truth[valid & (frac <= 0.4)] = -1

# trusted window
x0w, x1w = 505, 800
tw = truth[:, x0w:x1w]
cmp = np.ones((160, x1w - x0w), dtype=np.uint8) * 255
cmp[tw == 1] = 1; cmp[tw == -1] = 0

results = []
for upb, erb, owb, order in itertools.product(range(3), range(3), range(3), ['fwd', 'rev']):
    if len({upb, erb, owb}) != 3: continue
    s = draw((upb, erb, owb), order)
    sw = s[:, x0w:x1w]
    known = cmp != 255
    mism = (sw[known] != cmp[known]).sum()
    results.append((mism, f'up={upb} erase={erb} noow={owb} {order}', s))
results.sort()
print('\n-- variant ranking (mismatches in trusted window) --')
for mism, label, s in results[:6]:
    print(f'{mism:5d}  {label}')
best_label = results[0][1]
best_solid = results[0][2]
print('\nWINNER:', best_label)
np.save(r'C:\github\Lemmings\truth_fun3.npy', best_solid)
np.save(r'C:\github\Lemmings\truth_drawn_fun3.npy', drawn(best_solid))

print('\n-- port grid vs winner: rows with differences in trusted window --')
diffs = []
for y in range(160):
    p = port[y, x0w:x1w]; b = best_solid[y, x0w:x1w]
    if not np.array_equal(p, b):
        diffs.append(y)
print('rows differing:', diffs)
print('\n-- port grid vs GIF truth mismatches per row --')
tot = 0
for y in range(160):
    p = port[y, x0w:x1w]; kn = cmp[y] != 255
    m = (p[kn] != cmp[y][kn]).sum()
    tot += m
    if m: print(f'y{y:3d} mism={m:3d}')
print('total port-vs-truth mismatches:', tot)
print('\n-- winner vs GIF truth mismatches per row --')
tot = 0
for y in range(160):
    b = best_solid[y, x0w:x1w]; kn = cmp[y] != 255
    m = (b[kn] != cmp[y][kn]).sum()
    tot += m
    if m: print(f'y{y:3d} mism={m:3d}')
print('total winner-vs-truth mismatches:', tot)