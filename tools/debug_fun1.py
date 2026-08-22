import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG, decompress_dat
from parse_lvl import parse_level
from render_fun1 import load_tiles, render_terrain


def main():
    lv = parse_level(os.path.join(ORIG, 'level000.dat'))
    gx, tiles = load_tiles(lv['gfxset'])
    print('terrain table sizes (id: w x h):')
    for i, t in enumerate(gx['terrains'][:64]):
        if t['width']:
            print('  %2d: %3d x %3d  img=%5d mask=%5d' % (i, t['width'], t['height'], t['image'], t['mask']))
    print()
    print('entries (x, mods, y, id, w, h):')
    for x, mods, y, tid in lv['terrains'][:40]:
        w = gx['terrains'][tid]['width'] if tid < 64 else 0
        h = gx['terrains'][tid]['height'] if tid < 64 else 0
        print('  x=%4d mods=%d y=%4d id=%2d w=%3d h=%3d' % (x, mods, y, tid, w, h))
    px = render_terrain(lv, gx, tiles)
    # coverage per column in floor band
    print()
    print('floor band y=120..159 coverage per 16px column:')
    for x0 in range(0, 1600, 32):
        n = sum(1 for y in range(120, 160) for x in range(x0, min(x0 + 32, 1600)) if px[y * 1600 + x])
        print('  x%4d: %3d' % (x0, n))


if __name__ == '__main__':
    main()
