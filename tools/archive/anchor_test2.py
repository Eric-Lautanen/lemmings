import numpy as np, json, base64
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
g = assets['gfx'][assets['levels'][73]['gfxset']]
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
cap = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB'))[:160].astype(np.int32)

best_overall = None
for name in ['walk_r','walk_l','fall_r','fall_l']:
    a = main['anims'][name]
    for fi in range(len(a['f'])):
        f = unpack_px(a['f'][fi], a['w'], a['h'])
        for oy in range(66, 92):
            for ox in range(183, 209):
                m=0; tot=0
                for yy in range(a['h']):
                    for xx in range(a['w']):
                        v = f[yy,xx]
                        if not v: continue
                        cy2, cx2 = oy+yy, ox+xx
                        if cy2<0 or cy2>=160 or cx2<0 or cx2>=320: continue
                        tot+=1
                        if tuple(cap[cy2,cx2]) == tuple(pal[v]): m+=1
                r = m/max(1,tot)
                if best_overall is None or r > best_overall[0]:
                    best_overall = (r, name, fi, ox, oy, m, tot)
print('best match for walker near (195,77):')
r, name, fi, ox, oy, m, tot = best_overall
print(f'  {name} f{fi}: ratio={m}/{tot}={100*r:.1f}% sprite-topleft=({ox},{oy}) screen')
print(f'  world sprite-left={ox+624} -> DOS XPos would be {ox+624+8}; web lem.x would be {ox+624+1}')
