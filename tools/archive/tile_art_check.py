import numpy as np, json, base64

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
g3 = assets['gfx'][3]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w * h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2 * i] = (b >> 4) & 0xF
        if 2 * i + 1 < w * h: px[2 * i + 1] = b & 0xF
    return px.reshape(h, w)

def runs(row):
    out = []; inr = False
    for i, v in enumerate(row):
        if v and not inr: s = i; inr = True
        elif not v and inr: out.append((s, i - 1)); inr = False
    if inr: out.append((s, len(row) - 1))
    return out

# tiles used in Fun 3: 0,1,4,5,8,9,23,25,29,35,36,37,38,44
for tid in [0, 1, 4, 5, 8, 9, 23, 25, 29, 35, 36, 37, 38, 44]:
    t = g3['terrains'][tid]
    if t is None:
        print(f't{tid}: None'); continue
    w, h = t['w'], t['h']
    px = unpack_px(t['d'], w, h)
    col = px & 0x7          # 3 color planes
    msk = (px >> 3) & 1     # mask plane (bit 3)
    drawn = (col != 0) & (msk == 1)
    onlymask = (col == 0) & (msk == 1)
    n_om = onlymask.sum()
    print(f'--- t{tid} {w}x{h}: mask-only(no color) pixels = {n_om} / {w*h} ---')
    # show rows where mask-only or where drawn differs from port-solid (px!=0)
    for y in range(h):
        row_om = onlymask[y]
        row_drawn = drawn[y]
        row_px = (px[y] != 0)
        if row_om.any() or not np.array_equal(row_drawn, row_px):
            print(f'  y{y:2d} drawn:{runs(row_drawn)}  port-solid-diff:{runs(row_drawn != row_px)}  mask-only:{runs(row_om)}')
    # always print a few key rows for t0
    if tid == 0:
        for y in [0, 10, 19, 25, 26, 28, 30, 33]:
            print(f'  t0 y{y:2d} drawn:{runs(drawn[y])}  px:{runs(row_px if False else (px[y]!=0))}')