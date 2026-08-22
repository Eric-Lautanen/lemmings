import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import ORIG, decompress_dat, unpack_planar
from extract_graphics import parse_groundxo

W, H = 1600, 160
sec = decompress_dat(os.path.join(ORIG, 'level009.dat'))[6]
gx = parse_groundxo(os.path.join(ORIG, 'ground3o.dat'))
tsec = decompress_dat(os.path.join(ORIG, 'vgagr3.dat'))[0]
tiles = {}
for i, t in enumerate(gx['terrains']):
    if t['width']:
        w, h = t['width'], t['height']
        tiles[i] = (w, h, unpack_planar(tsec[t['image']:], 4, w, h))

entries = []
for i in range(400):
    e = sec[0x120 + i * 4:0x124 + i * 4]
    if int.from_bytes(e, 'big') == 0xFFFFFFFF:
        break
    x = ((e[0] & 0x0F) << 8) | e[1] - 16
    y = (e[2] << 1) | ((e[3] & 0x80) >> 7)
    if y >= 256:
        y -= 512
    y -= 4
    tid = (e[3] & 63) + (64 if (e[0] & 16) else 0)
    flags = e[0] >> 5
    entries.append((x, y, tid, flags))

def render(fx, fy):
    m = bytearray(W * H)
    for x, y, tid, f in entries:
        if tid not in tiles:
            continue
        w, h, px = tiles[tid]
        flipx = fx and (f & 1)
        flipy = fy and (f & 2)
        for ty in range(h):
            sy = h - 1 - ty if flipy else ty
            ly = y + sy
            if ly < 0 or ly >= H:
                continue
            for tx in range(w):
                sx = w - 1 - tx if flipx else tx
                if px[sy * w + sx] == 0:
                    continue
                lx = x + sx
                if 0 <= lx < W:
                    m[ly * W + lx] = 1
    return m

def runs(m, name):
    out = []
    for y in range(H):
        line = m[y * W:(y + 1) * W]
        cur = []
        start = None
        for x in range(W + 1):
            v = line[x] if x < W else 0
            if v and start is None:
                start = x
            elif not v and start is not None:
                cur.append('%d-%d' % (start, x - 1))
                start = None
        if cur:
            out.append('%3d: %s' % (y, ' '.join(cur)))
    with open(os.path.join(os.environ['TEMP'], 'opencode', 'lvl2_dos_' + name + '.txt'), 'w') as fh:
        fh.write('\n'.join(out))
    print(name, 'entries:', len(entries))

def main():
    runs(render(False, False), 'none')
    runs(render(True, True), 'both')
    runs(render(False, True), 'fy')

main()
