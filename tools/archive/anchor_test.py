import numpy as np, json, base64
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lv = assets['levels'][73]
g = assets['gfx'][lv['gfxset']]
FIXED6 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
pc = [tuple(e) for e in g['pc']]
pal = np.zeros((16,3), dtype=np.int32)
for i,(r,gg,b) in enumerate(FIXED6): pal[i] = (r*4, gg*4, b*4)
def x4(v): return int(round(v*63/255))*4
pal[7] = [x4(c) for c in pc[0]]
for i in range(8): pal[8+i] = [x4(c) for c in pc[i]]

def unpack_px(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w*h, dtype=np.uint8)
    for i, b in enumerate(d):
        px[2*i] = (b >> 4) & 0xF
        if 2*i+1 < w*h: px[2*i+1] = b & 0xF
    return px.reshape(h, w)

main = assets['main']
def anim(name):
    a = main['anims'][name]
    return [unpack_px(f, a['w'], a['h']) for f in a['f']], a['w'], a['h']

cap = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB'))[:160].astype(np.int32)
CAM = 624

# blue body color = palette idx 1 = (64,64,224): find clusters of blue pixels = lemmings
blue = (np.abs(cap - np.array([64,64,224])).sum(axis=2) < 30)
ys, xs = np.where(blue)
print('blue px count:', len(xs))
# cluster
pts = list(zip(xs, ys))
clusters = []
for x, y in pts:
    for c in clusters:
        if abs(c[0]-x) < 20 and abs(c[1]-y) < 20:
            c[0] = (c[0]*c[2]+x)/(c[2]+1); c[1] = (c[1]*c[2]+y)/(c[2]+1); c[2] += 1
            break
    else:
        clusters.append([float(x), float(y), 1])
clusters = [c for c in clusters if c[2] > 15]
print('lem clusters (cx, cy, npx):')
for c in clusters: print('  %.1f %.1f %d' % tuple(c))

# For each cluster, try matching walk_r frame 0 at offsets:
# hypothesis A (web): sprite left = x-1, top = y-h+1  -> we measure sprite-left/top directly
# We don't know web x; just record observed sprite bbox per cluster and compare with
# DOS prediction: sprite left = XPos-8, top = YPos-10 where XPos = spawn Left+24+k etc.
frames, w, h = anim('walk_r')
f0 = frames[0]
print('\ntemplate match walk_r f0 around each cluster:')
for cx, cy, n in clusters:
    x0, y0 = int(cx)-12, int(cy)-12
    best = None
    for oy in range(y0, y0+24):
        for ox in range(x0, x0+24):
            m = 0; tot = 0
            for yy in range(h):
                for xx in range(w):
                    v = f0[yy, xx]
                    if not v: continue
                    cy2, cx2 = oy+yy, ox+xx
                    if cy2 < 0 or cy2 >= 160 or cx2 < 0 or cx2 >= 320: continue
                    tot += 1
                    if tuple(cap[cy2, cx2]) == tuple(pal[v]): m += 1
            r = m/max(1,tot)
            if best is None or r > best[0]: best = (r, ox, oy, m, tot)
    print('  cluster (%.0f,%.0f): best ratio=%.2f at sprite-topleft=(%d,%d) -> world XPos=%d YPos=%d [DOS pred left=XPos-8=%d]' % (
        cx, cy, best[0], best[1], best[2], best[1]+8+CAM, best[2]+10, best[1]+8+CAM-8))
