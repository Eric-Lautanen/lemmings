import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG, decompress_dat, unpack_planar
from extract_graphics import parse_groundxo
from PIL import Image

TERRAIN_COLORS = {(97, 0, 16), (146, 32, 16), (195, 81, 16), (211, 130, 32)}

SCREENS = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp',
                       'opencode', 'lemmings-work', 'screens')


def load_terrain(gfxset):
    sec = decompress_dat(os.path.join(ORIG, 'vgagr%d.dat' % gfxset))[0]
    gx = parse_groundxo(os.path.join(ORIG, 'ground%do.dat' % gfxset))
    tiles = []
    for t in gx['terrains']:
        w, h = t['width'], t['height']
        if w == 0 or h == 0:
            tiles.append(None)
        else:
            tiles.append(unpack_planar(sec[t['image']:], 4, w, h))
    return tiles


def parse_terrain_entries(data):
    entries = []
    for i in range(0, 400 * 4, 4):
        e = data[0x120 + i:0x120 + i + 4]
        if all(b == 0 for b in e):
            break
        x12 = ((e[0] & 0x0F) << 8) | e[1]
        mod = e[0] >> 4
        y_mag = ((e[2] & 0x7F) << 1) | (e[3] >> 7)
        sign = (e[2] >> 7) & 1
        tid = e[3] & 0x7F
        entries.append((x12, mod, y_mag, sign, tid))
    return entries


def render_mask(entries, tiles, gx, yform, xform):
    W, H = 1600, 320
    mask = bytearray(W * H)
    for x12, mod, y_mag, sign, tid in entries:
        if tid >= len(tiles) or tiles[tid] is None:
            continue
        w, h = gx['terrains'][tid]['width'], gx['terrains'][tid]['height']
        t = tiles[tid]
        if yform == 'mag':
            y = y_mag - 256 if sign else y_mag
        elif yform == 'div8':
            y = (y_mag - 0x20) // 8
        else:
            y = (y_mag >> 3) - 4
        x = x12 - 16 if xform == 'min16' else x12
        for ty in range(h):
            ly = y + ty
            if ly < 0 or ly >= H:
                continue
            if mod & 0x4:
                ly = y + (h - 1 - ty)
                if ly < 0 or ly >= H:
                    continue
            for tx in range(w):
                lx = x + tx
                if lx < 0 or lx >= W:
                    continue
                if t[ty * w + tx] == 0:
                    continue
                idx = ly * W + lx
                if mod & 0x2:
                    mask[idx] = 0
                elif mod & 0x8:
                    if mask[idx] == 0:
                        mask[idx] = 1
                else:
                    mask[idx] = 1
    return mask


def main():
    img = Image.open(os.path.join(SCREENS, 'dos_letsgo.png')).convert('RGB')
    px = img.load()
    shot = [[1 if px[x, y] in TERRAIN_COLORS else 0 for x in range(320)] for y in range(160)]

    data = decompress_dat(os.path.join(ORIG, 'level000.dat'))[0]
    entries = parse_terrain_entries(data)
    print('terrain entries:', len(entries))
    gx = parse_groundxo(os.path.join(ORIG, 'ground0o.dat'))
    tiles = load_terrain(0)

    results = []
    for yform in ('mag', 'div8', 'rt'):
        for xform in ('min16', 'raw'):
            mask = render_mask(entries, tiles, gx, yform, xform)
            for startx in range(0, 1296, 8):
                same = total = 0
                for y in range(160):
                    for x in range(320):
                        lx = startx + x
                        m = mask[y * 1600 + lx] if lx < 1600 else 0
                        same += m == shot[y][x]
                        total += 1
                results.append((same / total, yform, xform, startx))
    results.sort(reverse=True)
    for r in results[:12]:
        print('match=%.4f yform=%-5s xform=%-5s startx=%d' % r)


if __name__ == '__main__':
    main()
