import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat

ORG = r'C:\github\Lemmings\original'
ground = open(os.path.join(ORG, 'ground3o.dat'), 'rb').read()

entries = []
for i in range(64):
    o = 448 + i * 8
    w = ground[o]; h = ground[o + 1]
    img = int.from_bytes(ground[o+2:o+4], 'little')
    maskptr = int.from_bytes(ground[o+4:o+6], 'little')
    vga = int.from_bytes(ground[o+6:o+8], 'little')
    entries.append((w, h, img, maskptr, vga))

terr, obj = decompress_dat(os.path.join(ORG, 'vgagr3.dat'))
print('terr section', len(terr), 'obj section', len(obj))

def decode_planes(data, w, h, base, planes, stride, plist=None):
    rb = (w + 7) // 8
    out = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            c = 0
            for p in range(planes):
                pi = plist[p] if plist else p
                bit = (data[base + pi * stride + y * rb + (x >> 3)] >> (7 - (x & 7))) & 1
                c |= bit << p
            out[y * w + x] = c
    return out

def decode_mask(data, w, h, base, stride):
    rb = (w + 7) // 8
    out = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            out[y * w + x] = (data[base + y * stride + (x >> 3)] >> (7 - (x & 7))) & 1
    return out

def rowfull(vals, y, w):
    return all(vals[y*w+x] != 0 for x in range(w))

def colfull(vals, y, x, w):
    return vals[y*w+x] != 0

for i in [0, 1, 4, 5, 8, 9, 23, 25, 29, 35, 36, 37, 38, 44]:
    w, h, img, maskptr, vga = entries[i]
    print(f't{i}: w={w} h={h} img={img} maskPtr={maskptr} vga={vga}')

t = entries[0]
w, h, img, maskptr, vga = t
rb = (w + 7) // 8
stride = rb * h
print()
print('=== t0 (64x34) ===')
print('img:', img, 'maskPtr:', maskptr, 'rb:', rb, 'stride:', stride)
print('3*rb*h =', 3 * stride, '  (extract.js assumed mask at img+3*rb*h)')

# color at img, plane-major, planes 0,1,2 (bits 0,1,2)
idx = decode_planes(terr, w, h, img, 3, stride)
print('color rows 0-1 full:', rowfull(idx, 0, w), rowfull(idx, 1, w))
for y in range(0, 6):
    print(f'  color row {y}: full={rowfull(idx, y, w)}')

# mask at maskPtr
m = decode_mask(terr, w, h, maskptr, rb)
hole_rows = [y for y in range(h) if not rowfull(m, y, w)]
print('mask@ptr: rows NOT fully solid:', hole_rows)
print('  row0..5:', [sum(m[y*w:(y+1)*w]) for y in range(6)])

# extract.js assumption
m2 = decode_mask(terr, w, h, img + 3 * stride, rb)
hole_rows2 = [y for y in range(h) if not rowfull(m2, y, w)]
print('mask@img+3rbh: rows NOT fully solid:', hole_rows2)

# also try mask as 4th plane of plane-major quad with planes reversed (mask first plane)
for order_name, plist in [('mask-first (3,2,1,0)', [3,2,1,0]), ('planes (0,1,2,3)', [0,1,2,3])]:
    m4 = [0] * (w * h)
    skip = False
    try:
        for y in range(h):
            for x in range(w):
                m4[y*w+x] = (terr[img + plist[0]*stride + y*rb + (x>>3)] >> (7-(x&7))) & 1
    except IndexError:
        skip = True
    if not skip:
        holes4 = [y for y in range(h) if not rowfull(m4, y, w)]
        print(f'mask as {order_name} plane: rows not full: {holes4}')

# t1
t1 = entries[1]
w1, h1, img1, maskptr1, vga1 = t1
rb1 = (w1 + 7) // 8
s1 = rb1 * h1
idx1 = decode_planes(terr, w1, h1, img1, 3, s1)
print()
print('=== t1 (48x64) ===')
print('img:', img1, 'maskPtr:', maskptr1)
print('img+3*rbh:', img1 + 3 * s1, ' (extract assumed mask here)')
print('color rows 0-1 full:', rowfull(idx1, 0, w1), rowfull(idx1, 1, w1))
m1 = decode_mask(terr, w1, h1, maskptr1, rb1)
holes1 = [y for y in range(h1) if not rowfull(m1, y, w1)]
print('mask@ptr: rows NOT fully solid:', holes1)
m1b = decode_mask(terr, w1, h1, img1 + 3 * s1, rb1)
holes1b = [y for y in range(h1) if not rowfull(m1b, y, w1)]
print('mask@img+3rbh: rows NOT fully solid:', holes1b)

# show t0 mask@ptr & color for rows 0..33 summary and the four known survivors columns
print()
print('=== t0 detail: mask@ptr row bytes and col runs (first 40 cols) ===')
for y in range(h):
    run = []
    for x in range(w):
        run.append('1' if m[y*w+x] else '0')
    if y < 12:
        print(f'  y{y:2d}: {"".join(run[:40])}')