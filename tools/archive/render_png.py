import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
from PIL import Image
from datcommon import ORIG, decompress_dat, unpack_planar
from extract_graphics import parse_groundxo, make_level_palette, vga_entry
from parse_lvl import parse_level

lv = parse_level(os.path.join(ORIG, 'level009.dat'), 6)
gx = parse_groundxo(os.path.join(ORIG, 'ground3o.dat'))
sec = decompress_dat(os.path.join(ORIG, 'vgagr3.dat'))[0]
tiles = {}
for i, t in enumerate(gx['terrains']):
    if t['width']:
        w, h = t['width'], t['height']
        tiles[i] = (w, h, unpack_planar(sec[t['image']:], 4, w, h))

W, H = 1600, 160
px = [0] * (W * H)
for x, mods, y, tid in lv['terrains']:
    y = int(round(y))
    if tid not in tiles:
        continue
    w, h, t = tiles[tid]
    for ty in range(h):
        ly = y + ty
        if not (0 <= ly < H):
            continue
        for tx in range(w):
            lx = x + tx
            if not (0 <= lx < W):
                continue
            v = t[ty * w + tx]
            if v:
                px[ly * W + lx] = v

pal = make_level_palette(gx['vga_custom'])
img = Image.new('RGB', (W, H))
d = img.load()
for i, v in enumerate(px):
    if v:
        x, y = i % W, i // W
        d[x, y] = tuple(pal[v])
img = img.resize((1600, 480), Image.NEAREST)
img.save(os.path.join(os.environ['TEMP'], 'opencode', 'lvl2_dos.png'))
print('saved')
