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

def unpack_bits(b64, w, h):
    d = base64.b64decode(b64)
    px = np.zeros(w*h, dtype=np.uint8)
    for j, b in enumerate(d):
        for k in range(8):
            p = j*8+k
            if p < w*h and (b >> (7-k)) & 1: px[p] = 1
    return px.reshape(h, w)

def test(cap_path, sec, cam, label):
    lv = assets['levels'][sec]
    g = assets['gfx'][lv['gfxset']]
    FIXED6 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(44,44,0),(60,8,8),(32,32,32)]
    pc = [tuple(e) for e in g['pc']]
    pal = np.zeros((16,3), dtype=np.int32)
    for i,(r,gg,b) in enumerate(FIXED6): pal[i] = (r*4, gg*4, b*4)
    def x4(v): return int(round(v*63/255))*4
    pal[7] = [x4(c) for c in pc[0]]
    for i in range(8): pal[8+i] = [x4(c) for c in pc[i]]
    ents = [(x,y) for (x,y,oid,m,dp) in lv['objs'] if oid == 1]
    if not ents:
        print(label, ': no entrance'); return
    ex, ey = ents[0]
    hatch = g['objects'][1]
    hw, hh = hatch['w'], hatch['h']
    capA = np.array(Image.open(cap_path).convert('RGB'))
    sc = capA.shape[1]/320.0
    ph = int(round(160*sc))
    if capA.shape[0] < ph:
        print(label, ': too small', capA.shape); return
    sx, sy = int(round((ex-cam)*sc)), int(round(ey*sc))
    print(f'{label}: entrance screen pos ({sx},{sy}) scale={sc}')
    for frame in range(hatch['n']):
        img = unpack_px(hatch['f'][frame][0], hw, hh)
        msk = unpack_bits(hatch['f'][frame][1], hw, hh)
        match=0; tot=0
        for yy in range(hh):
            for xx in range(hw):
                if not msk[yy,xx]: continue
                cy, cx = sy+int(round(yy*sc)), sx+int(round(xx*sc))
                if cy<0 or cy>=ph or cx<0 or cx>=capA.shape[1]: continue
                tot+=1
                if tuple(capA[cy,cx]) == tuple(pal[img[yy,xx]]): match+=1
        print(f'  frame {frame}: {match}/{tot} ({100.0*match/max(1,tot):.1f}%)')

# fun3a_f000: very first recorded frame of Fun 3 gameplay
test(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a_f000.png', 78, 505, 'fun3a f000 (Fun3)')
test(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a_f020.png', 78, 505, 'fun3a f020 (Fun3)')
