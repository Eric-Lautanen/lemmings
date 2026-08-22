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
    maskptr = int.from_bytes(ground[o+4:o+6], 'little')
    vga = int.from_bytes(ground[o+6:o+8], 'little')
    entries.append((w, h, img, maskptr, vga))

def plane(data, w, h, base, rb, stride, lsb):
    out = [0] * (w * h)
    for y in range(h):
        rowoff = base + y * stride
        for x in range(w):
            b = data[rowoff + (x >> 3)]
            bit = (b >> (x & 7 if lsb else 7 - (x & 7))) & 1
            out[y * w + x] = bit
    return out

def mask_ok(pl, w, h, holes_exact):
    holes = [y for y in range(h) if any(pl[y*w+x] == 0 for x in range(w))]
    ok = holes == holes_exact
    return ok, holes

def color_ok(pls, perm, w, h, rows_need_full):
    for y in rows_need_full:
        for x in range(w):
            v = 0
            for k, p in enumerate(perm):
                v |= pls[p][y*w+x] << k
            if v == 0:
                return False
    return True

# truth constraints
T0_HOLES = [1, 4, 8, 9]                      # erase mask holes (exact)
T0_COLOR_FULL_ROWS = [0, 1, 3, 6, 10, 11]    # belt rows + survivor rows, full width
T1_COLOR_FULL_ROWS = [0, 1]                  # pillar top rows

results = []
for lsb in (False, True):
  for stride_mode in ('pmajor', 'rinter'):
    for ti in (0, 1):
        w, h, img, maskptr, vga = entries[ti]
        rb = (w + 7) // 8
        if stride_mode == 'pmajor':
            ST = rb * h
            base = lambda p: img + p * ST
        else:
            ST = rb * h
            base = lambda p: img + p * rb   # row-interleaved: 4 planes per row
        pls = [plane(terr, w, h, base(p), rb, rb if stride_mode == 'rinter' else ST, lsb) for p in range(4)]
        for m in range(4):
            okm, holes = mask_ok(pls[m], w, h, T0_HOLES if ti == 0 else None)
            if not okm:
                continue
            for perm in itertools.permutations([p for p in range(4) if p != m]):
                blades = [(1 << k) for k in range(3)]
                blended = [pls[perm[0]][i] | pls[perm[1]][i] << 1 | pls[perm[2]][i] << 2 for i in range(w*h)]
                fullrows_needed = T0_COLOR_FULL_ROWS if ti == 0 else T1_COLOR_FULL_ROWS
                okc = all(all(blended[y*w+x] for x in range(w)) for y in fullrows_needed)
                if okc:
                    results.append((ti, lsb, stride_mode, m, perm))

print('combos satisfying constraints:')
for r in results:
    print(f'  tile={r[0]} lsb={r[1]} stride={r[2]} maskPlane={r[3]} colorPerm={r[4]}')

# also cross-check t1 with the t0 winner
print()
print('=== winner detail ===')
win = results[0] if results else None
for ti in (0, 1):
    w, h, img, maskptr, vga = entries[ti]
    rb = (w + 7) // 8
    ST = rb * h
    lsb = win[1]
    m = win[3]
    perm = win[4]
    pls = [plane(terr, w, h, img + p * ST, rb, ST, lsb) for p in range(4)]
    holes = [y for y in range(h) if any(pls[m][y*w+x] == 0 for x in range(w))]
    print(f't{ti}: mask holes = {holes}')
    for y in (0, 1, 2, 3, 6, 10, 11):
        nz = [x for x in range(w) if not (pls[perm[0]][y*w+x] | pls[perm[1]][y*w+x] << 1 | pls[perm[2]][y*w+x] << 2)]
        print(f'  color row {y}: zero-cols = {nz if len(nz) < 12 else len(nz)}')
    # t1 hole cols rows 0-1 in extract png were {1,4,8,9,18}: check where they come from in THAT decode
    if ti == 1:
        for p in range(4):
            zc = [x for x in range(w) if pls[p][0*w+x] == 0 and pls[p][1*w+x] == 0]
            print(f'  t1 masked-plane-{p} zero cols rows0-1: {zc}')