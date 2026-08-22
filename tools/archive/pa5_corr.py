import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = r'C:\github\Lemmings\original'
secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
s6 = secs[6]

chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
font = {}
for i, c in enumerate(chars):
    off = 0x1900 + i * 0x30
    px = dc.unpack_planar(s6[off:], 3, 8, 16)
    font[c] = px

s4 = secs[4]
pcolon = dc.unpack_planar(s4[0x69B0 + (0x3A - 0x21) * 0x60:], 3, 16, 16)

import zlib, struct
def load_png(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    pos = 8; idat = b''; w = h = None; colort = None
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]
        if typ == b'IHDR':
            w, h, bitd, colort = struct.unpack('>IIBB', d[pos+8:pos+18])
        elif typ == b'IDAT':
            idat += d[pos+8:pos+8+ln]
        elif typ == b'IEND':
            break
        pos += 12 + ln
    raw = zlib.decompress(idat)
    stride = w * 3
    out = []
    prev = bytearray(stride)
    pos = 0
    for y in range(h):
        f = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos+stride]); pos += stride
        if f == 1:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        prev = line
        out.append(line)
    return w, h, out

w, h, rows = load_png(r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png')
print('og_004', w, h)
strip = []
for y in range(160, 175):
    r = rows[y]
    strip.append([1 if r[x*3] > 128 else 0 for x in range(320)])

def match_at(c, x0, y0, dy_off=0):
    px = font[c]
    hit = 0
    for yy in range(15):
        ty = yy + dy_off
        if ty < 0 or ty >= 16: continue
        for xx in range(8):
            t = 1 if px[ty*8+xx] else 0
            v = strip[y0+yy][x0+xx]
            if t == v: hit += 1
    return hit

slots = [('A1', 112), ('A2', 120), ('A3', 128),
         ('B1', 144), ('B2', 152),
         ('C1', 185), ('C2', 192),
         ('D1', 208), ('D2', 216), ('D3', 224),
         ('E1', 248), ('E2', 256), ('E3', 264), ('E4', 272),
         ('F1', 288), ('F2', 296), ('F3', 304), ('F4', 312)]

out = []
for name, x0 in slots:
    best = []
    for c in chars:
        for dy in (0, 1):
            best.append((match_at(c, x0, 0, dy), c, dy))
    best.sort(reverse=True)
    line = '%s x=%d: ' % (name, x0) + '  '.join('%r(y%d)=%d' % (b[1], b[2], b[0]) for b in best[:4])
    out.append(line)
    print(line)

for dx in (-1, 0, 1):
    x0 = 144 + dx
    best = []
    for c in chars:
        for dy in (0, 1):
            best.append((match_at(c, x0, 0, dy), c, dy))
    best.sort(reverse=True)
    print('B1 x=%d:' % x0, ['%r(y%d)=%d' % (b[1], b[2], b[0]) for b in best[:3]])

pc = []
for dy in range(4):
    hit = 0
    for yy in range(16):
        for xx in range(16):
            t = 1 if pcolon[yy*16+xx] else 0
            sx = 296 + xx - 4
            if sx < 0 or sx >= 320: continue
            v = strip[dy+yy][sx] if dy+yy < 15 else 0
            if t == v: hit += 1
    pc.append((hit, dy))
print('purple ":" vs F2:', sorted(pc, reverse=True)[:4])

open(r'C:\Users\ericl\AppData\Local\Temp\opencode\pa5_corr.txt', 'w').write('\n'.join(out))
