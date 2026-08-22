import numpy as np, json, base64, itertools
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
    tiles[i] = None if t is None else unpack_px(t['d'], t['w'], t['h'])

truth = np.load(r'C:\github\Lemmings\truth_fun3.npy')
x0w, x1w = 505, 800

def draw(variant, order):
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

results = []
for upb, erb, owb, order in itertools.product(range(3), range(3), range(3), ['fwd', 'rev']):
    if len({upb, erb, owb}) != 3: continue
    s = draw((upb, erb, owb), order)
    mism = int((s[:, x0w:x1w] != truth[:, x0w:x1w]).sum())
    results.append((mism, f'up=bit{upb} erase=bit{erb} noow=bit{owb} {order}'))
results.sort()
for m, l in results:
    print(f'{m:6d}  {l}')
