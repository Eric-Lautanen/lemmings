import sys, os, itertools
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat

ORG = r'C:\github\Lemmings\original'
ground = open(os.path.join(ORG, 'ground3o.dat'), 'rb').read()
terr, obj = decompress_dat(os.path.join(ORG, 'vgagr3.dat'))

entries = []
for i in range(64):
    o = 448 + i * 8
    w = ground[o]; h = ground[o + 1]
    img = int.from_bytes(ground[o+2:o+4], 'little')
    entries.append((w, h, img))

def pixels(data, w, h, img, layout, bitorder):
    rb = (w + 7) // 8
    ST = rb * h
    planes = []
    for p in range(4):
        out = [0] * (w * h)
        for y in range(h):
            for x in range(w):
                if layout == 'pmajor':
                    off = img + p * ST + y * rb + (x >> 3)
                else:
                    off = img + y * 4 * rb + p * rb + (x >> 3)
                b = data[off]
                bit = (b >> (x & 7)) & 1 if bitorder == 'lsb' else (b >> (7 - (x & 7))) & 1
                out[y * w + x] = bit
        planes.append(out)
    return planes

def or3(a, b, c):
    return [a[i] | b[i] | c[i] for i in range(len(a))]

def check(t0pl, t1pl, t0perm, t1perm):
    w0, h0, img0 = entries[0]
    w1, h1, img1 = entries[1]
    c0 = or3(*(t0pl[p] for p in t0perm))
    c1 = or3(*(t1pl[p] for p in t1perm))
    # t0: rows 0-1 full
    if not all(c0[0*w0+x] and c0[1*w0+x] for x in range(w0)):
        return False
    # t1: rows 0-1 full, pillar cols 0-32 nonzero in rows 2-63
    if not all(c1[0*w1+x] and c1[1*w1+x] for x in range(w1)):
        return False
    for y in range(2, h1):
        if not all(c1[y*w1+x] for x in range(33)):
            return False
    return True

cands = []
for layout in ('pmajor', 'rinter'):
  for bitorder in ('msb', 'lsb'):
    pl0 = pixels(terr, *entries[0][:3], layout, bitorder)
    pl1 = pixels(terr, *entries[1][:3], layout, bitorder)
    for maskplane in range(4):
        for perm in itertools.permutations([p for p in range(4) if p != maskplane]):
            if check(pl0, pl1, perm, perm):
                cands.append((layout, bitorder, maskplane, perm))

print('candidates:', len(cands))
seen = set()
for layout, bitorder, maskplane, perm in cands:
    key = (layout, bitorder, frozenset(perm))
    if key in seen: continue
    seen.add(key)
    print(' ', layout, bitorder, 'colors={}'.format(sorted(perm)), 'mask=', set(range(4)) - set(perm))