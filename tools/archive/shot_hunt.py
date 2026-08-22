from PIL import Image
import sys, os, json
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat

# load walk anims from main.dat directly (same as extract_main.py)
s0 = decompress_dat(os.path.join(r'C:\github\Lemmings\original', 'main.dat'))[0]
def unpack_planar(d, planes, w, h):
    px = [0] * (w * h)
    rb = (w + 7) // 8
    for p in range(planes):
        for y in range(h):
            row = d[p * rb * h + y * rb:(p + 1) * rb * h + y * rb - (0 if False else p * rb * h) + (0 if False else 0)]
            pass
    # straightforward:
    for p in range(planes):
        plane = d[p * rb * h:(p + 1) * rb * h]
        for y in range(h):
            row = plane[y * rb:(y + 1) * rb]
            for x in range(w):
                if row[x >> 3] & (1 << (7 - (x & 7))):
                    px[y * w + x] |= 1 << p
    return px

def load_anim(off, n, w, h, bpp):
    frames = []
    for f in range(n):
        fr = off + f * (w * h * bpp // 8)
        px = unpack_planar(s0[fr:], bpp, w, h)
        frames.append(px)
    return frames

def sil(px): return [1 if v else 0 for v in px]
def mirror(px, w, h):
    q = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            q[y * w + x] = px[y * w + (w - 1 - x)]
    return q

var_r = [sil(f) for f in load_anim(0x0000, 8, 16, 10, 2)]
var_l = [sil(f) for f in load_anim(0x0168, 8, 16, 10, 2)]
var_mr = [mirror(f, 16, 10) for f in var_r]
var_ml = [mirror(f, 16, 10) for f in var_l]

img = Image.open(r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png').convert('RGB')
W, H = img.size
px = img.load()

def darkp(x, y):
    r, g, b = px[x, y]
    return 1 if (r + g + b) < 450 else 0   # lemming sprites are dark-ish on light sky

hits = []
for par in (0, 1):
    for y in range(1, H // 2 - 11):
        for x in range(1, W // 2 - 9):
            win = [darkp(x * 2 + par, y * 2 + par) for yy in range(10) for xx in range(16)]
            for name, v in (('r', var_r), ('l', var_l), ('mr', var_mr), ('ml', var_ml)):
                best = 0
                for f in v:
                    m = sum(1 for i in range(160) if win[i] == f[i])
                    if m > best: best = m
                if best > 150:
                    hits.append((best, x * 2 + par, y * 2 + par, name))
                    break

hits.sort(reverse=True)
print('hits (score, x, y, variant):', len(hits))
for h in hits[:40]:
    print(h)