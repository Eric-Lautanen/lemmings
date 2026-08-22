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
    # in-game palette: fixed 0-6 + custom[0] + custom (dirt set custom palette)
    pal = make_level_palette([(0x38, 0x20, 0x08)] * 8)
    img = Image.new('RGB', (320, 40))
    p = img.load()
    for y in range(40):
        for x in range(320):
            v = panel[y * 320 + x]
            if v == 0:
                p[x, y] = (0, 0, 0)
            else:
                p[x, y] = pal[v]
    img.save('build/panel_render.png')
    print('saved build/panel_render.png')

    demo = Image.open(os.path.join(SCREENS, 'dos_letsgo.png')).convert('RGB')
    pd = demo.load()
    # compare static pixels: which demo panel pixels are NOT in our render?
    diff = 0
    for y in range(160, 200):
        for x in range(320):
            mine = p[x, y - 160]
            theirs = pd[x, y]
            if mine != theirs:
                diff += 1
    print('diff pixels (demo vs panel render):', diff, '/', 320 * 40)
    print('mine has black where demo non-black:', sum(1 for y in range(160, 200) for x in range(320)
                                                      if p[x, y - 160] == (0, 0, 0) and pd[x, y] != (0, 0, 0)))
    print('demo has black where mine non-black:', sum(1 for y in range(160, 200) for x in range(320)
                                                      if p[x, y - 160] != (0, 0, 0) and pd[x, y] == (0, 0, 0)))


if __name__ == '__main__':
    main()
