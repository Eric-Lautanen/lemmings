#!/usr/bin/env python3
"""Compare JS engine world renders (build/render/js_world_N.ppm) with the
Python reference renderer for levels 0..9. Both must be pixel-identical."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from PIL import Image

def parse_level_any(fn, sec=0):
    from parse_lvl import parse_level
    return parse_level(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'original', fn), sec)

def render_py(idx):
    import render_fun1
    fn = 'level%03d.dat' % (idx // 8)
    lv = parse_level_any(fn, idx % 8)
    gx, tiles = render_fun1.load_tiles(lv['gfxset'])
    px = render_fun1.render_terrain(lv, gx, tiles)
    pal = render_fun1.pal_rgb(gx)
    img = Image.new('RGB', (1600, 160))
    d = img.load()
    for i, v in enumerate(px):
        if v:
            x, y = i % 1600, i // 1600
            d[x, y] = tuple(pal[v])
    return img

def main():
    import json
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'render')
    meta = json.load(open(os.path.join(base, 'meta.json')))
    bad = 0
    for i in range(10):
        p = os.path.join(base, 'js_world_%d.ppm' % i)
        if not os.path.exists(p):
            print('lvl', i, 'MISSING', p); bad += 1; continue
        js = Image.open(p).convert('RGB')
        py = render_py(i)
        if js.size != py.size:
            print('lvl', i, 'SIZE MISMATCH', js.size, py.size); bad += 1; continue
        # exclude object sprite rects (JS bakes objects, Python side is terrain-only)
        for r in meta[str(i)]['rects']:
            x0, y0, w, h = r
            x0 = max(0, min(x0, 1600)); y0 = max(0, min(y0, 160))
            w = min(w, 1600 - x0); h = min(h, 160 - y0)
            if w <= 0 or h <= 0: continue
            box = (x0, y0, x0 + w, y0 + h)
            js.paste((0, 0, 0), box); py.paste((0, 0, 0), box)
        a, b = js.tobytes(), py.tobytes()
        diff = sum(1 for x, y in zip(a, b) if x != y)
        total = len(a)
        same = total - diff
        pct = 100.0 * same / total
        print('lvl', i, 'identical pixels: %d/%d (%.2f%%)' % (same, total, pct))
        if diff:
            bad += 1
    print('RESULT:', 'FAIL' if bad else 'ALL 10 IDENTICAL (JS engine == Python renderer)')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
