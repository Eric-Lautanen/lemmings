import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from datcommon import ORIG, decompress_dat, unpack_planar
from extract_graphics import make_level_palette
from PIL import Image

SCREENS = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp',
                       'opencode', 'lemmings-work', 'screens')


def main():
    secs = decompress_dat(os.path.join(ORIG, 'main.dat'))
    s6 = secs[6]
    panel = unpack_planar(s6[0:], 4, 320, 40)
    pal = make_level_palette([(0x38, 0x20, 0x08)] * 8)
    p = [[0] * 320 for _ in range(40)]
    for y in range(40):
        for x in range(320):
            v = panel[y * 320 + x]
            p[y][x] = pal[v] if v else (0, 0, 0)

    demo = Image.open(os.path.join(SCREENS, 'dos_letsgo.png')).convert('RGB')
    pd = demo.load()
    for y in range(160, 200):
        rowd = []
        for x in range(320):
            if p[y - 160][x] != pd[x, y]:
                rowd.append(x)
        if rowd:
            # compress to ranges
            ranges = []
            a = b = rowd[0]
            for x in rowd[1:]:
                if x == b + 1:
                    b = x
                else:
                    ranges.append((a, b))
                    a = b = x
            ranges.append((a, b))
            print('y%d: %s' % (y, ', '.join('%d-%d' % r for r in ranges)))


if __name__ == '__main__':
    main()
