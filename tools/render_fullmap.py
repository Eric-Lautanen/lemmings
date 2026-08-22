import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG, decompress_dat
from parse_lvl import parse_level
from render_fun1 import load_tiles, render_terrain

CH = ' .:-=+*#%@'


def full_ascii(px, scale=8, W=1600, H=160):
    out = []
    for y in range(0, H, scale):
        row = ''
        for x in range(0, W, scale):
            # max over the block
            v = 0
            for dy in range(scale):
                for dx in range(scale):
                    v = max(v, px[(y + dy) * W + (x + dx)])
            row += CH[min(v, 9)]
        out.append(row)
    return '\n'.join(out)


def main():
    for idx in (0, 1, 3, 7):
        lv = parse_level(os.path.join(ORIG, 'level%03d.dat' % idx))
        gx, tiles = load_tiles(lv['gfxset'])
        px = render_terrain(lv, gx, tiles)
        print('===== level%03d %r (startx=%d) full map 1600x160 @1/8 =====' % (
            idx, lv['name'], lv['startx']))
        print(full_ascii(px))
        print()


if __name__ == '__main__':
    main()
