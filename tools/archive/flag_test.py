import numpy as np, json, base64, itertools
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
SEC = 73  # Fun 1
lv = assets['levels'][SEC]
g = assets['gfx'][lv['gfxset']]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w * h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2 * i] = (b >> 4) & 0xF
        if 2 * i + 1 < w * h: px[2 * i + 1] = b & 0xF
    return px.reshape(h, w)

tiles = [None if t is None else unpack_px(t['d'], t['w'], t['h']) for t in g['terrains']]

# palette (16 entries); FIXED given as 6-bit DAC values, pc already 8-bit
FIXED = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
pc = [tuple(e) for e in g['pc']]
pal16 = np.zeros((16,3), dtype=np.uint8)
pal16[0:7] = [(r*255//63, gg*255//63, b*255//63) for r,gg,b in FIXED]
pal16[7] = pc[0]
for i in range(8):
    pal16[8+i] = pc[i]

def render(mapping):
    """mapping: dict value->role; role in {'erase','flip','noow'}"""
    W, H = 1600, 160
    color = np.zeros((H, W), dtype=np.uint8)
    terr = np.zeros((H, W), dtype=bool)
    for (x, mods, y, tid) in lv['terrain']:
        t = tiles[tid]
        if t is None: continue
        h, w = t.shape
        y = int(round(y))
        roles = set()
        for v in (1,2,4):
            if mods & v: roles.add(mapping[v])
        flip = 'flip' in roles
        for yy in range(h):
            sy = h-1-yy if flip else yy
            ly = y + yy
            if ly < 0 or ly >= H: continue
            row = t[sy]
            for xx in range(w):
                v = row[xx]
                if not v: continue
                lx = x + xx
                if lx < 0 or lx >= W: continue
                i = ly*W+lx
                if 'erase' in roles:
                    color.flat[i] = 0; terr.flat[i] = False
                elif 'noow' in roles and terr.flat[i]:
                    continue
                else:
                    color.flat[i] = v; terr.flat[i] = True
    rgb = pal16[color]
    rgb[~terr & (color==0)] = 0
    return rgb

cap = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB')
print('capture size:', cap.size)
capA = np.array(cap)
if capA.shape[0] >= 200 and capA.shape[1] >= 320:
    # native 320x200 (or scaled); normalize to 320x160 field
    sc = capA.shape[1] / 320.0
    ph = int(round(160*sc))
    field = capA[:ph]
else:
    sc = 1; ph = 160; field = capA[:160]

mappings = {
    'M1 lemmix-bin 1=erase,2=flip,4=noow': {1:'erase',2:'flip',4:'noow'},
    'M2 1=flip,2=erase,4=noow':            {1:'flip',2:'erase',4:'noow'},
    'M3 1=noow,2=erase,4=flip':            {1:'noow',2:'erase',4:'flip'},
    'M4 1=noow,2=flip,4=erase':            {1:'noow',2:'flip',4:'erase'},
    'M5 ignore-all (current web)':         {1:'x',2:'x',4:'x'},
}

for label, mp in mappings.items():
    world = render(mp)
    best = (-1, None)
    for cam in range(0, 1280, 2):
        win = world[:, cam:cam+320]
        if win.shape[1] < 320: break
        # scale window to capture scale
        if abs(sc-1) > 0.01:
            img = Image.fromarray(win).resize((capA.shape[1], ph), Image.NEAREST)
            warr = np.array(img)
        else:
            warr = win
        m = int((warr == field).all(axis=2).sum())
        if m > best[0]: best = (m, cam)
    tot = field.shape[0]*field.shape[1]*3
    print(f'{label}: best cam={best[1]} match={best[0]}/{tot} ({100.0*best[0]/tot:.2f}%)')
