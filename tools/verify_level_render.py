import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG
from parse_lvl import parse_level
from render_fun1 import load_tiles, render_terrain
from extract_graphics import make_level_palette
from PIL import Image

REF = os.path.join(os.path.dirname(__file__), '..', 'build', 'ref', 'sshot3_dosdays_fun1.png')
WORLD_W = 1600
VIEW_W, VIEW_H = 320, 160


def classify_shot(ref_path, pal, tol=14):
    im = Image.open(ref_path).convert('RGB')
    im = im.resize((VIEW_W, VIEW_H * 2), Image.NEAREST)
    p = im.load()

    def cls(x, y):
        if not (0 <= x < VIEW_W and 0 <= y < VIEW_H):
            return -1
        px = tuple(p[x, y])
        for i in range(16):
            if all(abs(px[j] - pal[i][j]) <= tol for j in range(3)):
                return i
        return -1

    return cls


def main():
    lv = parse_level(os.path.join(ORIG, 'level000.dat'))
    gx, tiles = load_tiles(lv['gfxset'])
    px = render_terrain(lv, gx, tiles)
    pal = make_level_palette(gx['vga_custom'])
    cls = classify_shot(REF, pal)

    best = None
    for cam in range(0, 1265, 8):
        tp = fp = 0
        for y in range(VIEW_H):
            for x in range(VIEW_W):
                rv = px[y * WORLD_W + cam + x]
                sv = cls(x, y)
                if rv >= 7 and sv >= 7:
                    tp += 1
                elif rv >= 7 and sv < 7:
                    fp += 1
        score = tp - 2 * fp
        if best is None or score > best[0]:
            best = (score, cam, tp, fp)

    sc, cam, tp, fp = best
    pure = 100.0 * tp / (tp + fp)
    print('level000 vs %s' % os.path.basename(REF))
    print('  best cam=%d (startx=%d)  tp=%d fp=%d  purity=%.1f%%  score=%d' % (
        cam, lv['startx'], tp, fp, pure, sc))
    # fp here = pixels the game modified after level start (bashed/diggered
    # holes, lemming/object colors) plus sub-pixel y offsets; the camera of
    # the screenshot must sit at the active mid-level region near startx.
    # A shot captured mid-play sits elsewhere; with purity >= 90 the
    # brute-force camera is trustworthy on its own.
    ok = (sc > 12000 and pure >= 80.0 and
          (abs(cam - lv['startx']) <= 64 or pure >= 90.0))
    print('  VERIFY: %s' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())