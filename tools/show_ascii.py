import os
import sys
import datcommon as dc
from extract_graphics import extract_graphics_set, parse_groundxo

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CHARS = [' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']


def show(px, w, h, label, maxw=96):
    print(f'--- {label} ({w}x{h}) ---')
    for y in range(min(h, maxw)):
        row = ''
        for x in range(w):
            row += CHARS[px[y * w + x] % 16]
        print(row)


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else '0'
    gx, terrain, objs = extract_graphics_set(f'original/vgagr{which}.dat', f'original/ground{which}o.dat')
    # show first few terrain pieces
    shown = 0
    for i, t in enumerate(terrain):
        if t is None:
            continue
        info = gx['terrains'][i]
        show(t, info['width'], info['height'], f'set{which} terrain {i} (w={info["width"]} h={info["height"]})')
        shown += 1
        if shown >= 3:
            break
    # show object 0 (exit) and 1 (entrance) first frames with mask
    for oi in (0, 1):
        o = objs[oi]
        if o is None:
            continue
        w, h = o['meta']['width'], o['meta']['height']
        img, msk = o['frames'][0]
        px = [v if m else 0 for v, m in zip(img, msk)]
        show(px, w, h, f'set{which} object {oi} frame 0 (masked)')
    # show one terrain piece with colors as palette letters (8-15)
    for i, t in enumerate(terrain):
        if t is None:
            continue
        info = gx['terrains'][i]
        if info['width'] <= 32 and info['height'] <= 32:
            show(t, info['width'], info['height'], f'set{which} terrain {i} color legend')
            break


if __name__ == '__main__':
    main()
