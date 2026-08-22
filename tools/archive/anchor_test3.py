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

# search below/right of hatch (hatch spans screen x80..128, y36..61); lem falls from x~96..112
results = []
for name in ['fall_r','fall_l','walk_r','walk_l']:
    a = main['anims'][name]
    for fi in range(len(a['f'])):
        f = unpack_px(a['f'][fi], a['w'], a['h'])
        for oy in range(55, 80):
            for ox in range(88, 122):
                m=0; tot=0
                ok=True
                for yy in range(a['h']):
                    for xx in range(a['w']):
                        v = f[yy,xx]
                        if not v: continue
                        cy2, cx2 = oy+yy, ox+xx
                        if cy2<0 or cy2>=160 or cx2<0 or cx2>=320: continue
                        tot+=1
                        if tuple(cap[cy2,cx2]) == tuple(pal[v]): m+=1
                if tot >= 12:
                    results.append((m/tot, m, tot, name, fi, ox, oy))
results.sort(reverse=True)
seen=set()
print('top matches (falling lem near hatch):')
for r,m,tot,name,fi,ox,oy in results[:400]:
    key=(name,)
    if r < 0.9: break
    if key in seen: continue
    seen.add(key)
    print(f'  {name} f{fi}: {m}/{tot}={100*r:.1f}% sprite-topleft=({ox},{oy}) world-left={ox+624} DOS-XPos-pred={ox+624+8} web-x-pred={ox+624+1}')
