import numpy as np, json, base64
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
SEC = 73  # Fun 1 (vgalemmi_002)
lv = assets['levels'][SEC]
g = assets['gfx'][lv['gfxset']]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w * h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2 * i] = (b >> 4) & 0xF
        if 2 * i + 1 < w * h: px[2 * i + 1] = b & 0xF
    return px.reshape(h, w)

def unpack_bits(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w * h, dtype=np.uint8)
    for j, b in enumerate(d):
        for k in range(8):
            p = j*8+k
            if p < w*h and (b >> (7-k)) & 1: px[p] = 1
    return px.reshape(h, w)

tiles = [None if t is None else unpack_px(t['d'], t['w'], t['h']) for t in g['terrains']]

# x4 palette; bundled pc is 8-bit (*255//63) -> recover raw 6-bit then x4
FIXED6 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
pc = [tuple(e) for e in g['pc']]
pal = np.zeros((16,3), dtype=np.int32)
for i,(r,gg,b) in enumerate(FIXED6): pal[i] = (r*4, gg*4, b*4)
def x4(v): return int(round(v*63/255))*4
pal[7] = [x4(c) for c in pc[0]]
for i in range(8): pal[8+i] = [x4(c) for c in pc[i]]

# object rects to exclude (all frames same size)
objrects = []
for (x,y,oid,mods,disp) in lv['objs']:
    o = g['objects'][oid]
    if o is None: continue
    objrects.append((x,y,o['w'],o['h']))

def render(mapping):
    W,H = 1600,160
    color = np.zeros((H,W), dtype=np.uint8)
    terr = np.zeros((H,W), dtype=bool)
    for (x, mods, y, tid) in lv['terrain']:
        t = tiles[tid]
        if t is None: continue
        h,w = t.shape
        y = int(round(y))
        roles = set(mapping[v] for v in (1,2,4) if mods & v)
        flip = 'flip' in roles
        for yy in range(h):
            sy = h-1-yy if flip else yy
            ly = y+yy
            if ly<0 or ly>=H: continue
            row = t[sy]
            base = ly*W
            for xx in range(w):
                v = row[xx]
                if not v: continue
                lx = x+xx
                if lx<0 or lx>=W: continue
                i = base+lx
                if 'erase' in roles:
                    color.flat[i]=0; terr.flat[i]=False
                elif 'noow' in roles and terr.flat[i]:
                    continue
                else:
                    color.flat[i]=v; terr.flat[i]=True
    out = pal[color]
    out[~terr & (color==0)] = 0
    return out

cap = np.array(Image.open(r'C:\github\Lemmings\tools\capture\native\vgalemmi_002.png').convert('RGB'))[:160].astype(np.int32)
mask = np.ones((160,320), dtype=bool)
for (x,y,w,h) in objrects:
    for cy in range(max(0,y), min(160,y+h)):
        for cx in range(max(0,x-320), min(320,x+w)):
            mask[cy,cx] = False   # can't know cam yet; apply after shift instead

mappings = {
    'M1 lemmix-bin 1=erase,2=flip,4=noow': {1:'erase',2:'flip',4:'noow'},
    'M2 1=flip,2=erase,4=noow':            {1:'flip',2:'erase',4:'noow'},
    'M3 1=noow,2=erase,4=flip':            {1:'noow',2:'erase',4:'flip'},
    'M5 ignore-all (current web)':         {1:'x',2:'x',4:'x'},
}
results=[]
for label, mp in mappings.items():
    world = render(mp)
    best=(-1,None)
    for cam in range(0,1281):
        win = world[:, cam:cam+320]
        if win.shape[1]<320: break
        excl = np.zeros((160,320), dtype=bool)
        for (x,y,w,h) in objrects:
            x0=max(0,x-cam); x1=min(320,x+w-cam)
            y0=max(0,y); y1=min(160,y+h)
            if x0<x1 and y0<y1: excl[y0:y1, x0:x1]=True
        m = mask & ~excl
        eq = (np.abs(win-cap).sum(axis=2)==0) & m
        score = int(eq.sum())
        if score>best[0]: best=(score,cam)
    tot = int(mask.sum())
    results.append((tot-best[0], best, label))
results.sort()
for bad,(score,cam),label in results:
    print(f'{label}: cam={cam} matched={score} mismatched={bad}')
