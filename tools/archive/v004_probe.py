import numpy as np, json, base64
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
SEC = 77  # Fun 2 (vgalemmi_004)
lv = assets['levels'][SEC]
g = assets['gfx'][lv['gfxset']]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w*h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2*i] = (b >> 4) & 0xF
        if 2*i+1 < w*h: px[2*i+1] = b & 0xF
    return px.reshape(h, w)

tiles = [None if t is None else unpack_px(t['d'], t['w'], t['h']) for t in g['terrains']]
FIXED6 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
pc = [tuple(e) for e in g['pc']]
pal = np.zeros((16,3), dtype=np.int32)
for i,(r,gg,b) in enumerate(FIXED6): pal[i] = (r*4, gg*4, b*4)
def x4(v): return int(round(v*63/255))*4
pal[7] = [x4(c) for c in pc[0]]
for i in range(8): pal[8+i] = [x4(c) for c in pc[i]]

# terrain-only world (Lemmix flag semantics), objects excluded via rects
W,H = 1600,160
color = np.zeros((H,W), dtype=np.uint8)
terr = np.zeros((H,W), dtype=bool)
for (x, mods, y, tid) in lv['terrain']:
    t = tiles[tid]
    if t is None: continue
    h,w = t.shape
    y = int(round(y))
    erase = bool(mods & 1); flip = bool(mods & 2); noow = bool(mods & 4)
    for yy in range(h):
        sy = h-1-yy if flip else yy
        ly = y+yy
        if ly<0 or ly>=H: continue
        row = t[sy]
        for xx in range(w):
            v = row[xx]
            if not v: continue
            lx = x+xx
            if lx<0 or lx>=W: continue
            i = ly*W+lx
            if erase: color.flat[i]=0; terr.flat[i]=False
            elif noow and terr.flat[i]: continue
            else: color.flat[i]=v; terr.flat[i]=True
world = pal[color]
world[~terr & (color==0)] = 0

objrects = [(x,y,o['w'],o['h']) for (x,y,oid,m,dp) in lv['objs'] for o in [g['objects'][oid]] if o]

cap = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB'))[:160].astype(np.int32)
best=(-1,None)
for cam in range(0,1281):
    win = world[:, cam:cam+320]
    if win.shape[1]<320: break
    excl = np.zeros((160,320), dtype=bool)
    for (x,y,w,h) in objrects:
        x0=max(0,x-cam); x1=min(320,x+w-cam); y0=max(0,y); y1=min(160,y+h)
        if x0<x1 and y0<y1: excl[y0:y1, x0:x1]=True
    eq = (np.abs(win-cap).sum(axis=2)==0) & ~excl
    s = int(eq.sum())
    if s>best[0]: best=(s,cam)
print('v004 terrain cam search: best cam=%d matched=%d' % (best[1], best[0]))

CAM = best[1]
ents = [(x,y) for (x,y,oid,m,dp) in lv['objs'] if oid==1]
print('entrances:', ents, '-> spawn world x =', ents[0][0]+24, '= screen', ents[0][0]+24-CAM, '; DOS sprite-left screen x =', ents[0][0]+24-8-CAM, '; web sprite-left =', ents[0][0]+24+1-CAM)

# find isolated falling lem: search fall frames in open air below hatch
main = assets['main']
results=[]
for name in ['fall_r','fall_l','walk_r','walk_l']:
    a = main['anims'][name]
    for fi in range(len(a['f'])):
        f = unpack_px(a['f'][fi], a['w'], a['h'])
        for oy in range(50, 130):
            for ox in range(0, 310):
                m=0; tot=0
                for yy in range(a['h']):
                    for xx in range(a['w']):
                        v=f[yy,xx]
                        if not v: continue
                        cy2,cx2 = oy+yy, ox+xx
                        if cy2>=160 or cx2>=320: continue
                        tot+=1
                        if tuple(cap[cy2,cx2])==tuple(pal[v]): m+=1
                if tot>=15 and m==tot:
                    results.append((name,fi,ox,oy,tot))
print('perfect sprite matches (100%%, >=15 px):')
for r in results[:40]: print('  %s f%d at (%d,%d) n=%d -> world sprite-left=%d' % (r[0],r[1],r[2],r[3],r[4],r[2]+CAM))
