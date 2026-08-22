import numpy as np, json, base64
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lv = assets['levels'][73]
g = assets['gfx'][lv['gfxset']]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w*h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2*i] = (b >> 4) & 0xF
        if 2*i+1 < w*h: px[2*i+1] = b & 0xF
    return px.reshape(h, w)

def unpack_bits(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w*h, dtype=np.uint8)
    for j, b in enumerate(d):
        for k in range(8):
            p = j*8+k
            if p < w*h and (b >> (7-k)) & 1: px[p] = 1
    return px.reshape(h, w)

FIXED6 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
pc = [tuple(e) for e in g['pc']]
pal = np.zeros((16,3), dtype=np.int32)
for i,(r,gg,b) in enumerate(FIXED6): pal[i] = (r*4, gg*4, b*4)
def x4(v): return int(round(v*63/255))*4
pal[7] = [x4(c) for c in pc[0]]
for i in range(8): pal[8+i] = [x4(c) for c in pc[i]]

# find entrance object (id 1)
ents = [(x,y) for (x,y,oid,m,dp) in lv['objs'] if oid == 1]
print('entrances:', ents)
ex, ey = ents[0]
hatch = g['objects'][1]
hw, hh = hatch['w'], hatch['h']
print('hatch size:', hw, hh)

cap = np.array(Image.open(r'C:\github\Lemmings\tools\capture\native\vgalemmi_002.png').convert('RGB'))[:160].astype(np.int32)
CAM = 624
sx, sy = ex - CAM, ey
if sx < -20 or sx > 320: print('entrance off-screen at cam 624!')
else:
    print('entrance on screen at', sx, sy)
    for frame in range(hatch['n']):
        img = unpack_px(hatch['f'][frame][0], hw, hh)
        msk = unpack_bits(hatch['f'][frame][1], hw, hh)
        match = 0; tot = 0
        for yy in range(hh):
            for xx in range(hw):
                if not msk[yy,xx]: continue
                cy, cx = sy+yy, sx+xx
                if cy<0 or cy>=160 or cx<0 or cx>=320: continue
                tot += 1
                if tuple(cap[cy,cx]) == tuple(pal[img[yy,xx]]): match += 1
        print(f'frame {frame}: mask px={tot} rgb-match={match} ({100.0*match/max(1,tot):.1f}%)')
