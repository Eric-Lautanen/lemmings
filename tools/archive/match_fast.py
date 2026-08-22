import os, sys
import numpy as np
sys.path.insert(0, r'C:\github\Lemmings\tools')
from PIL import Image
import datcommon as dc
from extract_graphics import parse_groundxo, vga_entry, FIXED_LOW_RGB

ORIG = r'C:\github\Lemmings\original'
DIR = r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work\realshots'

gxs, TPX, PAL = {}, {}, {}
for gs in range(5):
    gx = parse_groundxo(os.path.join(ORIG, 'ground%do.dat' % gs))
    gxs[gs] = gx
    PAL[gs] = list(FIXED_LOW_RGB) + [vga_entry(e) for e in gx['vga_custom']]
    secs = dc.decompress_dat(os.path.join(ORIG, 'vgagr%d.dat' % gs))
    TPX[gs] = {}
    for i, t in enumerate(gx['terrains']):
        if t['width']:
            w, h = t['width'], t['height']
            TPX[gs][i] = (w, h,
                          (np.array(dc.unpack_planar(secs[0][t['image']:], 4, w, h)) != 0).reshape(h, w))

def ydecode(e, kind):
    if kind == 'A':
        coarse = e[2] - 256 if e[2] >= 128 else e[2]
        return coarse * 2 + (e[3] >> 7) - 4, e[3] & 0x3F
    yr = (e[2] << 4) | (e[3] >> 4)
    if yr >= 0x800:
        yr -= 0x1000
    return round((yr - 0x20) / 8), (e[3] & 0x0F if kind == 'B' else e[3] & 0x3F)

def build_mask(lv, sec, gs, kind):
    m = np.zeros((160, 1600), bool)
    for i in range(400):
        e = lv[0x120 + i * 4:0x124 + i * 4]
        if all(b == 0xFF for b in e):
            break
        x = ((e[0] & 0x0F) << 8) | e[1] - 16
        y, tid = ydecode(e, kind)
        t = TPX[gs].get(tid)
        if t is None:
            continue
        w, h, px = t
        x0, y0 = x, y
        ry0, ry1 = max(0, -y0), min(h, 160 - y0)
        rx0, rx1 = max(0, -x0), min(w, 1600 - x0)
        if ry1 <= ry0 or rx1 <= rx0:
            continue
        sub = px[ry0:ry1, rx0:rx1]
        m[y0 + ry0:y0 + ry1, x0 + rx0:x0 + rx1] |= sub
    return m

def classify(shot, gs):
    im = Image.open(shot).convert('RGB')
    sim = im.resize((320, 400), Image.NEAREST)
    pal = np.array(PAL[gs])
    a = np.array(sim)
    d = ((a[..., None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    cls = d.argmin(-1)
    mind = d.min(-1)
    cls[mind > 14 * 14 * 3] = -1
    return cls[:320:2]

def score(shot, gs, mask, cams):
    cls = classify(shot, gs)
    best = (-1e9, 0)
    for cam in cams:
        sub = mask[:, cam:cam + 320]
        tp = (sub & (cls >= 8)).sum()
        fp = (sub & (cls < 0)).sum()
        sc = tp - fp * 2
        if sc > best[0]:
            best = (sc, cam)
    return best

# precompute all 80 sections x 3 kinds
masks = {}
for lv in range(10):
    data = dc.decompress_dat(os.path.join(ORIG, 'level%03d.dat' % lv))
    for sec in range(8):
        gs = int.from_bytes(data[sec][0x1A:0x1C], 'big') & 0xFF
        for kind in 'ABC':
            masks[(lv, sec, kind)] = build_mask(data[sec], sec, gs, kind)

for f in sorted(os.listdir(DIR)):
    if not f.endswith('.png'):
        continue
    print(f)
    res = []
    cams = range(0, 1265, 16)
    for (lv, sec, kind), m in masks.items():
        sc, cam = score(os.path.join(DIR, f), 0, m, cams)
        res.append((sc, lv, sec, kind, cam))
    res.sort(reverse=True)
    for r in res[:6]:
        print('   score=%d lvl=%d sec=%d kind=%s cam=%d' % r)
