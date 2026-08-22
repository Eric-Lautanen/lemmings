import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG, decompress_dat, unpack_planar
from extract_graphics import parse_groundxo, make_level_palette
from parse_lvl import parse_level
from PIL import Image

BUILD = os.path.join(os.path.dirname(__file__), '..', 'build')


def load_tiles(gfxset):
    sec = decompress_dat(os.path.join(ORIG, 'vgagr%d.dat' % gfxset))[0]
    gx = parse_groundxo(os.path.join(ORIG, 'ground%do.dat' % gfxset))
    tiles = []
    for t in gx['terrains']:
        w, h = t['width'], t['height']
        if w == 0 or h == 0:
            tiles.append(None)
        else:
            tiles.append(unpack_planar(sec[t['image']:], 4, w, h))
    return gx, tiles


def load_objects(gfxset):
    sec = decompress_dat(os.path.join(ORIG, 'vgagr%d.dat' % gfxset))[1]
    gx = parse_groundxo(os.path.join(ORIG, 'ground%do.dat' % gfxset))
    objs = []
    for o in gx['objects']:
        w, h = o['width'], o['height']
        if w == 0 or h == 0:
            objs.append(None)
            continue
        start = o['base'] + o['start'] * o['frame_size']
        img = unpack_planar(sec[start:], 4, w, h)
        mask = unpack_planar(sec[start + o['mask_off']:], 1, w, h)
        objs.append((w, h, img, mask))
    return objs


def render_terrain(lv, gx, tiles, W=1600, H=160):
    """Terrain with DOS combine flags (Lemmix tdf_, verified vs captures):
    mods 1 = erase, 2 = invert (flip vertical), 4 = no-overwrite."""
    px = [0] * (W * H)
    for x, mods, y, tid in lv['terrains']:
        y = int(round(y))
        if tid >= len(tiles) or tiles[tid] is None:
            continue
        w, h = gx['terrains'][tid]['width'], gx['terrains'][tid]['height']
        t = tiles[tid]
        erase = mods & 1
        flip = mods & 2
        noow = mods & 4
        for ty in range(h):
            syrow = h - 1 - ty if flip else ty
            ly = y + ty
            for tx in range(w):
                lx = x + tx
                if not (0 <= lx < W and 0 <= ly < H):
                    continue
                v = t[syrow * w + tx]
                if not v:
                    continue
                i = ly * W + lx
                if erase:
                    px[i] = 0
                elif noow and px[i]:
                    continue
                else:
                    px[i] = v
    return px


def render_objects(lv, objs, W=1600, H=160):
    px = [0] * (W * H)
    for x, yr, oid, mods, disp in lv['objs']:
        if oid >= len(objs) or objs[oid] is None:
            continue
        w, h, img, mask = objs[oid]
        fy = disp == 0x8F
        for ty in range(h):
            sy = h - 1 - ty if fy else ty
            ly = yr + ty
            for tx in range(w):
                if not mask[sy * w + tx]:
                    continue
                lx = x + tx
                if not (0 <= lx < W and 0 <= ly < H):
                    continue
                px[ly * W + lx] = img[sy * w + tx]
    return px


def pal_rgb(gx):
    return make_level_palette(gx['vga_custom'])


def view_image(px, gx, cam, W=1600):
    rgb = pal_rgb(gx)
    img = Image.new('RGB', (320, 160))
    p = img.load()
    for y in range(160):
        for x in range(320):
            p[x, y] = rgb[px[y * W + cam + x]]
    return img


def main():
    lv = parse_level(os.path.join(ORIG, 'level000.dat'), 0)
    gx, tiles = load_tiles(lv['gfxset'])
    objs = load_objects(lv['gfxset'])
    px = render_terrain(lv, gx, tiles)
    po = render_objects(lv, objs)
    combo = [o or t for t, o in zip(px, po)]

    for cam in (lv['startx'], 336):
        img = view_image(combo, gx, cam)
        img.save(os.path.join(BUILD, 'fun1_view_cam%d.png' % cam))
        print('saved build/fun1_view_cam%d.png' % cam)

    p = Image.new('RGB', (1584, 160))
    pl = p.load()
    rgb = pal_rgb(gx)
    for y in range(160):
        for x in range(1584):
            pl[x, y] = rgb[combo[y * 1600 + x]]
    p.save(os.path.join(BUILD, 'fun1_world.png'))
    print('saved build/fun1_world.png (terrain + objects, corrected decode)')


if __name__ == '__main__':
    main()