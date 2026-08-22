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

good = []
for layout in ('pmajor', 'rinter'):
  for bitorder in ('msb', 'lsb'):
    for maskplane in range(4):
        colorplanes = [p for p in range(4) if p != maskplane]
        for perm in itertools.permutations(colorplanes):
            ok = True
            for ti in (0, 1):
                w, h, img = entries[ti]
                pl = pixels(terr, w, h, img, layout, bitorder)
                color = or3(pl[perm[0]], pl[perm[1]], pl[perm[2]])
                if not all(color[y*w+x] for x in range(w) for y in (0, 1)):
                    ok = False
                    break
                if ti == 0:
                    if any(color[y*w+x] for y in range(2, h) for x in range(w)):
                        ok = False
                        break
            if ok:
                good.append((layout, bitorder, maskplane, perm))

print('satisfying (layout, bitorder, maskplane, colorperm):')
for g in good:
    print(' ', g)
