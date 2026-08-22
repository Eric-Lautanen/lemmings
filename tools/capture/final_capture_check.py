import numpy as np, json, base64
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w*h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2*i] = (b >> 4) & 0xF
        if 2*i+1 < w*h: px[2*i+1] = b & 0xF
    return px.reshape(h, w)

def check(sec, capfile):
    lv = assets['levels'][sec]
    g = assets['gfx'][lv['gfxset']]
    tiles = [None if t is None else unpack_px(t['d'], t['w'], t['h']) for t in g['terrains']]
    pal = np.zeros((16,3), dtype=np.int32)
    FIXED6 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
    for i,(r,gg,b) in enumerate(FIXED6): pal[i] = (r*4, gg*4, b*4)
    pc = [tuple(e) for e in g['pc']]
    pal[7] = pc[0]
    for i in range(8): pal[8+i] = pc[i]
    W,H = 1600,160
    color = np.zeros((H,W), dtype=np.uint8)
    terr = np.zeros((H,W), dtype=bool)
    for (x, mods, y, tid) in lv['terrain']:
        t = tiles[tid]
        if t is None: continue
        h,w = t.shape; y = int(round(y))
        erase=mods&1; flip=mods&2; noow=mods&4
        for yy in range(h):
            sy = h-1-yy if flip else yy
            ly=y+yy
            if ly<0 or ly>=H: continue
            row=t[sy]
            for xx in range(w):
                v=row[xx]
                if not v: continue
                lx=x+xx
                if lx<0 or lx>=W: continue
                i=ly*W+lx
                if erase: color.flat[i]=0; terr.flat[i]=False
                elif noow and terr.flat[i]: continue
                else: color.flat[i]=v; terr.flat[i]=True
    world = pal[color]
    world[~terr & (color==0)] = 0
    objrects = [(x,y,o['w'],o['h']) for (x,y,oid,m,dp) in lv['objs'] for o in [g['objects'][oid]] if o]
    cap = np.array(Image.open(capfile).convert('RGB'))[:160].astype(np.int32)
    best=(-1,None)
    for cam in range(0,1281):
        win = world[:, cam:cam+320]
        if win.shape[1]<320: break
        excl = np.zeros((160,320), dtype=bool)
        for (x,y,w,h) in objrects:
            x0=max(0,x-cam); x1=min(320,x+w-cam); y0=max(0,y); y1=min(160,y+h)
            if x0<x1 and y0<y1: excl[y0:y1, x0:x1]=True
        eq = (np.abs(win-cap).sum(axis=2)==0) & ~excl
        s=int(eq.sum())
        if s>best[0]: best=(s,cam)
    tot = 160*320 - sum((min(160,y+h)-max(0,y))*(min(320,x+w-cam)-max(0,x-cam)) for (x,y,w,h) in objrects for cam in [best[1]] if min(320,x+w-cam)>max(0,x-cam) and min(160,y+h)>max(0,y))
    print(f'sec {sec} vs {capfile.split(chr(92))[-1]}: cam={best[1]} (startx={lv["startx"]}) matched={best[0]}')

check(73, r'C:\github\Lemmings\tools\capture\native\vgalemmi_002.png')
check(77, r'C:\github\Lemmings\tools\capture\native\vgalemmi_004.png')
check(79, r'C:\github\Lemmings\tools\capture\native\vgalemmi_006.png')
