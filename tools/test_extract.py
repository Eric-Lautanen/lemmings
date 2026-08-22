import os
import sys
import datcommon as dc
from extract_graphics import (parse_groundxo, extract_graphics_set,
                              make_level_palette, check_frame_counts)
from PIL import Image

ORIG = dc.ORIG


def sheet_from_images(images, palette, gap=2, ncols=8, maxcell=64):
    n = len(images)
    if n == 0:
        return None
    rows = (n + ncols - 1) // ncols
    cellw = max([w for (w, h, px) in images] or [1])
    cellh = max([h for (w, h, px) in images] or [1])
    sheetw = ncols * (cellw + gap)
    sheeth = rows * (cellh + gap)
    sheet = Image.new('RGB', (sheetw, sheeth), (40, 40, 40))
    for i, img in enumerate(images):
        if img is None:
            continue
        w, h, px = img
        x = (i % ncols) * (cellw + gap)
        y = (i // ncols) * (cellh + gap)
        for yy in range(h):
            for xx in range(w):
                idx = px[yy * w + xx]
                if idx:
                    sheet.putpixel((x + xx, y + yy), palette[idx])
    return sheet


def main():
    for i in range(5):
        gr = os.path.join(ORIG, f'vgagr{i}.dat')
        gnd = os.path.join(ORIG, f'ground{i}o.dat')
        print(f'== set {i} ==')
        check_frame_counts(gnd)
        gx, terrain, objs = extract_graphics_set(gr, gnd)
        pal = make_level_palette(gx['vga_custom'])
        print(f'  palette custom: {gx["vga_custom"]}')
        print(f'  terrain pieces: {len([t for t in terrain if t])}  objects: {len([o for o in objs if o])}')
        # terrain sheet (use real sizes from groundXo)
        timgs = []
        for t, info in zip(terrain, gx['terrains']):
            if t is None:
                continue
            timgs.append((info['width'], info['height'], t))
        sh = sheet_from_images(timgs, pal, ncols=8)
        if sh:
            sh.save(os.path.join('build', 'preview', f'terrain{i}.png'))

        oimgs = []
        for o in objs:
            if o is None:
                continue
            w, h = o['meta']['width'], o['meta']['height']
            for f, m in o['frames']:
                im = [v if m2 else 0 for v, m2 in zip(f, m)]
                oimgs.append((w, h, im))
        sh = sheet_from_images(oimgs, pal, ncols=8)
        if sh:
            sh.save(os.path.join('build', 'preview', f'objects{i}.png'))
        print(f'  saved set{i}')


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    main()
