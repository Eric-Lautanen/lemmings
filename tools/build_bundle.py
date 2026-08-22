import os
import sys
import json
import base64

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datcommon import ORIG, decompress_dat, unpack_planar, mask_to_bits
from parse_lvl import parse_level
from extract_graphics import parse_groundxo
from extract_main import ANIMS, MASKS


def b64(b):
    return base64.b64encode(bytes(b)).decode()


# ---- 120-slot DOS menu order: (rank, num, section, stats-source) ----
# Order verified against the Lemmings Level Database DOS packs (473-476) and
# the SuperLemmix "DMA Lemmings Compilation" sxlv set.  Each menu slot
# references one of the 80 level sections; 40 sections appear twice (once
# with their embedded header stats, once with their oddtable.dat override).
MENU_ORDER = [
    ('Fun',  1, 73, 'emb'),
    ('Fun',  2, 77, 'emb'),
    ('Fun',  3, 78, 'emb'),
    ('Fun',  4, 74, 'emb'),
    ('Fun',  5, 75, 'emb'),
    ('Fun',  6, 76, 'emb'),
    ('Fun',  7, 79, 'emb'),
    ('Fun',  8,  6, 'odd'),
    ('Fun',  9, 10, 'odd'),
    ('Fun', 10, 26, 'odd'),
    ('Fun', 11, 34, 'odd'),
    ('Fun', 12,  7, 'odd'),
    ('Fun', 13, 14, 'emb'),
    ('Fun', 14, 15, 'odd'),
    ('Fun', 15, 18, 'odd'),
    ('Fun', 16, 20, 'odd'),
    ('Fun', 17, 23, 'odd'),
    ('Fun', 18, 35, 'odd'),
    ('Fun', 19, 41, 'odd'),
    ('Fun', 20, 51, 'odd'),
    ('Fun', 21, 68, 'odd'),
    ('Fun', 22, 11, 'emb'),
    ('Fun', 23, 33, 'odd'),
    ('Fun', 24, 47, 'odd'),
    ('Fun', 25, 48, 'odd'),
    ('Fun', 26, 57, 'odd'),
    ('Fun', 27, 38, 'odd'),
    ('Fun', 28, 49, 'odd'),
    ('Fun', 29, 53, 'odd'),
    ('Fun', 30, 66, 'odd'),
    ('Tricky',  1,  0, 'emb'),
    ('Tricky',  2, 14, 'odd'),
    ('Tricky',  3, 17, 'odd'),
    ('Tricky',  4, 24, 'odd'),
    ('Tricky',  5, 25, 'odd'),
    ('Tricky',  6, 27, 'odd'),
    ('Tricky',  7, 28, 'odd'),
    ('Tricky',  8, 39, 'odd'),
    ('Tricky',  9, 50, 'odd'),
    ('Tricky', 10, 59, 'odd'),
    ('Tricky', 11, 63, 'odd'),
    ('Tricky', 12, 64, 'odd'),
    ('Tricky', 13, 67, 'odd'),
    ('Tricky', 14,  2, 'emb'),
    ('Tricky', 15, 73, 'odd'),
    ('Tricky', 16, 75, 'odd'),
    ('Tricky', 17, 76, 'odd'),
    ('Tricky', 18, 77, 'odd'),
    ('Tricky', 19, 79, 'odd'),
    ('Tricky', 20,  3, 'emb'),
    ('Tricky', 21,  5, 'emb'),
    ('Tricky', 22,  6, 'emb'),
    ('Tricky', 23,  7, 'emb'),
    ('Tricky', 24,  8, 'emb'),
    ('Tricky', 25,  9, 'emb'),
    ('Tricky', 26, 10, 'emb'),
    ('Tricky', 27, 12, 'emb'),
    ('Tricky', 28, 13, 'emb'),
    ('Tricky', 29, 16, 'emb'),
    ('Tricky', 30, 15, 'emb'),
    ('Taxing',  1, 18, 'emb'),
    ('Taxing',  2, 19, 'emb'),
    ('Taxing',  3, 20, 'emb'),
    ('Taxing',  4, 21, 'emb'),
    ('Taxing',  5, 22, 'emb'),
    ('Taxing',  6, 23, 'emb'),
    ('Taxing',  7, 24, 'emb'),
    ('Taxing',  8, 25, 'emb'),
    ('Taxing',  9, 26, 'emb'),
    ('Taxing', 10, 27, 'emb'),
    ('Taxing', 11, 28, 'emb'),
    ('Taxing', 12, 29, 'emb'),
    ('Taxing', 13, 30, 'emb'),
    ('Taxing', 14, 31, 'emb'),
    ('Taxing', 15,  1, 'emb'),
    ('Taxing', 16, 32, 'emb'),
    ('Taxing', 17, 33, 'emb'),
    ('Taxing', 18, 34, 'emb'),
    ('Taxing', 19, 35, 'emb'),
    ('Taxing', 20, 36, 'emb'),
    ('Taxing', 21, 37, 'emb'),
    ('Taxing', 22, 38, 'emb'),
    ('Taxing', 23, 39, 'emb'),
    ('Taxing', 24, 40, 'emb'),
    ('Taxing', 25, 41, 'emb'),
    ('Taxing', 26, 42, 'emb'),
    ('Taxing', 27, 43, 'emb'),
    ('Taxing', 28, 44, 'emb'),
    ('Taxing', 29, 17, 'emb'),
    ('Taxing', 30, 55, 'emb'),
    ('Mayhem',  1, 45, 'emb'),
    ('Mayhem',  2, 46, 'emb'),
    ('Mayhem',  3, 47, 'emb'),
    ('Mayhem',  4, 48, 'emb'),
    ('Mayhem',  5, 49, 'emb'),
    ('Mayhem',  6, 50, 'emb'),
    ('Mayhem',  7, 51, 'emb'),
    ('Mayhem',  8, 52, 'emb'),
    ('Mayhem',  9, 53, 'emb'),
    ('Mayhem', 10, 54, 'emb'),
    ('Mayhem', 11, 55, 'odd'),
    ('Mayhem', 12, 56, 'emb'),
    ('Mayhem', 13, 57, 'emb'),
    ('Mayhem', 14, 58, 'emb'),
    ('Mayhem', 15, 59, 'emb'),
    ('Mayhem', 16, 60, 'emb'),
    ('Mayhem', 17, 61, 'emb'),
    ('Mayhem', 18, 62, 'emb'),
    ('Mayhem', 19, 63, 'emb'),
    ('Mayhem', 20, 74, 'odd'),
    ('Mayhem', 21, 64, 'emb'),
    ('Mayhem', 22,  4, 'emb'),
    ('Mayhem', 23, 65, 'emb'),
    ('Mayhem', 24, 66, 'emb'),
    ('Mayhem', 25, 67, 'emb'),
    ('Mayhem', 26, 68, 'emb'),
    ('Mayhem', 27, 69, 'emb'),
    ('Mayhem', 28, 70, 'emb'),
    ('Mayhem', 29, 71, 'emb'),
    ('Mayhem', 30, 72, 'emb'),
]


def pack1(bits, w, h):
    out = bytearray((w * h + 7) // 8)
    for y in range(h):
        for x in range(w):
            if bits[y * w + x]:
                out[y * ((w + 7) // 8) + (x >> 3)] |= 1 << (7 - (x & 7))
    return out


def pack4(px, w, h):
    out = bytearray((w * h + 1) // 2)
    for y in range(h):
        for x in range(0, w, 2):
            v0 = px[y * w + x] & 0xF
            v1 = px[y * w + x + 1] & 0xF if x + 1 < w else 0
            out[y * ((w + 1) // 2) + (x >> 1)] = (v0 << 4) | v1
    return out


def pack_planar(px, w, h, bpp):
    """Game planar layout: plane-major, 8 px/byte, MSB-first."""
    rb = (w + 7) // 8
    out = bytearray(rb * h * bpp)
    for y in range(h):
        for x in range(w):
            v = px[y * w + x]
            for p in range(bpp):
                if (v >> p) & 1:
                    out[p * rb * h + y * rb + (x >> 3)] |= 1 << (7 - (x & 7))
    return out


def main():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # ---- levels: 10 files x 8 sections = 80 levels ----
    levels = []
    for i in range(80):
        lv = parse_level(os.path.join(ORIG, 'level%03d.dat' % (i // 8)), i % 8)
        levels.append(dict(
            name=lv['name'], rate=lv['rate'], lems=lv['lems'], rescue=lv['rescue'],
            time=lv['time'], skills=lv['skills'], startx=lv['startx'],
            gfxset=lv['gfxset'], objs=lv['objs'], terrain=lv['terrains'],
            steel=lv['steels']))

    # ---- oddtable (80 header overrides, raw uncompressed) ----
    # keep the pre-override embedded copy for 'emb' menu slots
    levels_emb = [dict(lv) for lv in levels]
    odd = open(os.path.join(ORIG, 'oddtable.dat'), 'rb').read()
    odd_recs = []
    for i in range(80):
        rec = odd[i * 56:(i + 1) * 56]
        name = rec[0x18:0x38].rstrip(b' ').decode('ascii', 'replace')
        vals = [int.from_bytes(rec[j:j + 2], 'big') for j in range(0, 24, 2)]
        odd_recs.append(dict(name=name, rate=vals[0], lems=vals[1], rescue=vals[2],
                             time=vals[3], skills=vals[4:12]))
    # apply header overrides
    for i, r in enumerate(odd_recs):
        if 'non-used duplicate' in r['name']:
            continue
        lv = levels[i]
        lv.update(rate=r['rate'], lems=r['lems'], rescue=r['rescue'],
                  time=r['time'], skills=r['skills'], name=r['name'])
    # ---- 120-slot DOS menu (rank + position -> section + stats source) ----
    # levels[] carries oddtable overrides; levels_emb[] has the original
    # embedded header stats, so 'emb' slots get their original name/stats.
    menu = []
    for rank, num, sec, src in MENU_ORDER:
        lv = levels[sec] if src == 'odd' else levels_emb[sec]
        menu.append(dict(rank=rank, num=num, section=sec,
                         name=lv['name'], rate=lv['rate'], lems=lv['lems'],
                         rescue=lv['rescue'], time=lv['time'], skills=lv['skills']))
    assert len(menu) == 120 and len({m['section'] for m in menu}) == 80
    print('levels:')
    for i, lv in enumerate(levels):
        print('  %2d: %r gfx=%d startx=%d' % (i, lv['name'], lv['gfxset'], lv['startx']))

    # ---- graphics sets ----
    gfx = []
    for g in range(5):
        gx = parse_groundxo(os.path.join(ORIG, 'ground%do.dat' % g))
        secs = decompress_dat(os.path.join(ORIG, 'vgagr%d.dat' % g))
        tsec, osec = secs[0], secs[1]
        terrains = []
        for t in gx['terrains']:
            w, h = t['width'], t['height']
            if w == 0 or h == 0:
                terrains.append(None)
            else:
                px = unpack_planar(tsec[t['image']:], 4, w, h)
                terrains.append({'w': w, 'h': h, 'd': b64(pack4(px, w, h))})
        objects = []
        for o in gx['objects']:
            w, h = o['width'], o['height']
            if w == 0 or h == 0:
                objects.append(None)
                continue
            frames = []
            for f in range(o['end']):
                start = o['base'] + f * o['frame_size']
                img = unpack_planar(osec[start:], 4, w, h)
                mask = mask_to_bits(osec[start + o['mask_off']:], w, h)
                frames.append([b64(pack4(img, w, h)), b64(pack1(mask, w, h))])
            objects.append({'w': w, 'h': h, 'n': o['end'], 's': o['start'],
                            'a': o['anim_flags'], 'snd': o['sound'], 'f': frames})
        gfx.append(dict(
            terrains=terrains,
            objects=objects,
            pc=[vga_entry(e) for e in gx['vga_custom']],
            pp=[vga_entry(e) for e in gx['vga_preview']],
            triggers=[[o['trig_l'], o['trig_t'], o['trig_w'], o['trig_h'],
                       o['trig_effect']] for o in gx['objects']]))
    print('gfx sets parsed')

    # ---- vgaspec ----
    vg = []
    for i in range(4):
        spec = json.load(open(os.path.join('build', 'vgaspec%d.json' % i)))
        px = spec['bitmap']
        w, h = 960, 160
        vg.append({'p': spec['palette'], 'd': b64(pack_planar(px, w, h, 3))})
    print('vgaspec parsed')

    # ---- main.dat ----
    secs = decompress_dat(os.path.join(ORIG, 'main.dat'))
    s0, s1, s2, s6 = secs[0], secs[1], secs[2], secs[6]
    anims = {}
    for name, n, w, h, bpp, off in ANIMS:
        frames = []
        for f in range(n):
            fr = off + f * (w * h * bpp // 8)
            px = unpack_planar(s0[fr:], bpp, w, h)
            frames.append(b64(pack_planar(px, w, h, bpp)))
        anims[name] = {'w': w, 'h': h, 'bpp': bpp, 'f': frames}
    masks = {}
    for name, n, w, h, off in MASKS:
        frames = []
        for f in range(n):
            fr = off + f * (w * h // 8)
            frames.append(b64(pack1(mask_to_bits(s1[fr:], w, h), w, h)))
        masks[name] = {'w': w, 'h': h, 'f': frames}
    # HUD digit font: sec2 @ 0x1900, 8 B/glyph, order R0 L0 R1 L1 ... R9 L9
    hud = []
    for i in range(20):
        g = mask_to_bits(s2[0x1900 + i * 8:], 8, 8)
        hud.append(b64(pack1(g, 8, 8)))
    # bomber countdown digits: sec1 @ 0x154, 5 glyphs 8x8 = digits 5..1
    # (Lemmix Styles.Base: Msk($0154, 'Countdown digits', 5, 8, 8))
    countdown = []
    for i in range(5):
        g = mask_to_bits(s1[0x154 + i * 8:], 8, 8)
        countdown.append(b64(pack1(g, 8, 8)))
    # panel + green font
    panel = b64(pack4(unpack_planar(s6[0:], 4, 320, 40), 320, 40))
    font_chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    font = {}
    for i, c in enumerate(font_chars):
        off = 0x1900 + i * 0x30
        font[c] = b64(pack_planar(unpack_planar(s6[off:], 3, 8, 16), 8, 16, 3))

    assets = dict(
        levels=levels,
        menu=menu,
        oddtable=odd_recs,
        gfx=gfx,
        vg=vg,
        main=dict(anims=anims, masks=masks, hud=hud, countdown=countdown, panel=panel, font=font),
    )
    with open(os.path.join('build', 'assets.json'), 'w') as fh:
        json.dump(assets, fh)
    for p in ('build', 'web'):
        with open(os.path.join(p, 'assets.js'), 'w') as fh:
            fh.write('window.GAME_ASSETS=' + json.dumps(assets) + ';')
    print('bundle written, bytes:', os.path.getsize(os.path.join('build', 'assets.js')))


def vga_entry(b3):
    # DOS VGA DAC -> RGB as captured natively (value * 4, i.e. <<2; verified
    # pixel-exact against vgalemmi_002/004 captures: 52 -> 208, 44 -> 176 ...)
    r, g, b = b3
    return [(r & 0x3F) * 4, (g & 0x3F) * 4, (b & 0x3F) * 4]


if __name__ == '__main__':
    main()
