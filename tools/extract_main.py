import os
import struct
import datcommon as dc
from extract_graphics import make_level_palette, FIXED_LOW_RGB, vga_entry

ORIG = dc.ORIG

MENU_PALETTE = [
    (0, 0, 0), (128, 64, 32), (96, 48, 32), (48, 0, 16),
    (32, 8, 124), (64, 44, 144), (104, 88, 164), (152, 140, 188),
    (0, 80, 0), (0, 96, 16), (0, 112, 32), (0, 128, 64),
    (208, 208, 208), (176, 176, 0), (64, 80, 176), (224, 128, 144),
]

# section 0: (name, frames, w, h, bpp, offset)
ANIMS = [
    ('walk_r', 8, 16, 10, 2, 0x0000),
    ('jump_r', 1, 16, 10, 2, 0x0140),
    ('walk_l', 8, 16, 10, 2, 0x0168),
    ('jump_l', 1, 16, 10, 2, 0x02A8),
    ('dig', 16, 16, 14, 3, 0x02D0),
    ('climb_r', 8, 16, 12, 2, 0x0810),
    ('climb_l', 8, 16, 12, 2, 0x0990),
    ('drown', 16, 16, 10, 2, 0x0B10),
    ('postclimb_r', 8, 16, 12, 2, 0x0D90),
    ('postclimb_l', 8, 16, 12, 2, 0x0F10),
    ('build_r', 16, 16, 13, 3, 0x1090),
    ('build_l', 16, 16, 13, 3, 0x1570),
    ('bash_r', 32, 16, 10, 3, 0x1A50),
    ('bash_l', 32, 16, 10, 3, 0x21D0),
    ('mine_r', 24, 16, 13, 3, 0x2950),
    ('mine_l', 24, 16, 13, 3, 0x30A0),
    ('fall_r', 4, 16, 10, 2, 0x37F0),
    ('fall_l', 4, 16, 10, 2, 0x3890),
    # Umbrella = 8 frames @ 0x3930 / 0x3C30 (Lemmix Styles.Base layout: the
    # first 4 frames are the "pre-umbrella" flail, then the open umbrella)
    ('umbrella_r', 8, 16, 16, 3, 0x3930),
    ('umbrella_l', 8, 16, 16, 3, 0x3C30),
    ('splat', 16, 16, 10, 2, 0x3F30),
    ('exit', 8, 16, 13, 2, 0x41B0),
    ('fried', 14, 16, 14, 4, 0x4350),
    ('block', 16, 16, 10, 2, 0x4970),
    ('shrug_r', 8, 16, 10, 2, 0x4BF0),
    ('shrug_l', 8, 16, 10, 2, 0x4D30),
    ('ohno', 16, 16, 10, 2, 0x4E70),
    ('explode', 1, 32, 32, 3, 0x50F0),
]

MASKS = [
    ('bash_mask_r', 4, 16, 10, 0x0000),
    ('bash_mask_l', 4, 16, 10, 0x0050),
    ('mine_mask_r', 2, 16, 13, 0x00A0),
    ('mine_mask_l', 2, 16, 13, 0x00D4),
    ('explode_mask', 1, 16, 22, 0x0108),
]

DIGITS = [(str(i), 0x0134 + (9 - i) * 8) for i in range(10)]  # "9" first at 0x0134


def main():
    secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
    print('sections:', len(secs), [len(s) for s in secs])
    s0 = secs[0]
    import json
    out = {'anims': {}, 'masks': {}, 'digits': {}}
    for name, n, w, h, bpp, off in ANIMS:
        frames = []
        for f in range(n):
            fr = off + f * (w * h * bpp // 8)
            px = dc.unpack_planar(s0[fr:], bpp, w, h)
            frames.append(px)
        out['anims'][name] = {'n': n, 'w': w, 'h': h, 'frames': frames}
    s1 = secs[1]
    for name, n, w, h, off in MASKS:
        frames = []
        for f in range(n):
            fr = off + f * (w * h // 8)
            frames.append(dc.mask_to_bits(s1[fr:], w, h))
        out['masks'][name] = {'n': n, 'w': w, 'h': h, 'frames': frames}
    for d, off in DIGITS:
        out['digits'][d] = dc.mask_to_bits(s1[off:], 8, 8)
    # panel + fonts
    s6 = secs[6]
    out['panel'] = dc.unpack_planar(s6[0:], 4, 320, 40)
    out['font8x16'] = {}
    font_chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for i, c in enumerate(font_chars):
        off = 0x1900 + i * 0x30
        out['font8x16'][c] = dc.unpack_planar(s6[off:], 3, 8, 16)
    # menu graphics
    s3 = secs[3]
    s4 = secs[4]
    out['brown_bg'] = dc.unpack_planar(s3[0x0000:], 2, 320, 104)
    out['logo'] = dc.unpack_planar(s3[0x2080:], 4, 632, 94)
    out['signs'] = {}
    for name, off in [('f1', 0x9488), ('f2', 0xA2D4), ('f3', 0xB120), ('rating', 0xBF6C),
                      ('exit', 0xCDB8), ('f4', 0xDC04)]:
        out['signs'][name] = dc.unpack_planar(s3[off:], 4, 120, 61)
    out['music_icon'] = dc.unpack_planar(s3[0xEA50:], 4, 64, 31)
    out['fx_icon'] = dc.unpack_planar(s3[0xEE30:], 4, 64, 31)
    out['blinks'] = []
    for b in range(7):
        frames = []
        for f in range(8):
            off = b * 0x600 + f * 192
            frames.append(dc.unpack_planar(s4[off:], 4, 32, 12))
        out['blinks'].append(frames)
    out['scroller_l'] = []
    for f in range(16):
        out['scroller_l'].append(dc.unpack_planar(s4[0x2A00 + f * 384:], 4, 48, 16))
    out['scroller_r'] = []
    for f in range(16):
        out['scroller_r'].append(dc.unpack_planar(s4[0x4200 + f * 384:], 4, 48, 16))
    out['reel'] = dc.unpack_planar(s4[0x5A00:], 4, 16, 16)
    out['rating_signs'] = {}
    for name, off in [('mayhem', 0x5A80), ('taxing', 0x5E4C), ('tricky', 0x6218), ('fun', 0x65E4)]:
        out['rating_signs'][name] = dc.unpack_planar(s4[off:], 4, 72, 27)
    out['purple_font'] = {}
    for code in range(0x21, 0x7F):
        off = 0x69B0 + (code - 0x21) * 0x60
        out['purple_font'][chr(code)] = dc.unpack_planar(s4[off:], 3, 16, 16)
    with open(os.path.join('build', 'main_data.json'), 'w') as fh:
        json.dump({k: v for k, v in out.items()}, fh)
    print('main.dat parsed')


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    main()
