"""Verify main_data.json is a lossless round-trip of main.dat sections.

Re-encodes every extracted region from JSON and compares byte-for-byte
against the decompressed DAT sections. PASS means the JSON data is
bit-exact with the original game file (self-consistent, no mangling).
"""
import os
import json
import datcommon as dc

ORIG = dc.ORIG
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ANIMS = [
    ('walk_r', 8, 16, 10, 2, 0x0000), ('jump_r', 1, 16, 10, 2, 0x0140),
    ('walk_l', 8, 16, 10, 2, 0x0168), ('jump_l', 1, 16, 10, 2, 0x02A8),
    ('dig', 16, 16, 14, 3, 0x02D0), ('climb_r', 8, 16, 12, 2, 0x0810),
    ('climb_l', 8, 16, 12, 2, 0x0990), ('drown', 16, 16, 10, 2, 0x0B10),
    ('postclimb_r', 8, 16, 12, 2, 0x0D90), ('postclimb_l', 8, 16, 12, 2, 0x0F10),
    ('build_r', 16, 16, 13, 3, 0x1090), ('build_l', 16, 16, 13, 3, 0x1570),
    ('bash_r', 32, 16, 10, 3, 0x1A50), ('bash_l', 32, 16, 10, 3, 0x21D0),
    ('mine_r', 24, 16, 13, 3, 0x2950), ('mine_l', 24, 16, 13, 3, 0x30A0),
    ('fall_r', 4, 16, 10, 2, 0x37F0), ('fall_l', 4, 16, 10, 2, 0x3890),
    ('preum_r', 4, 16, 16, 3, 0x3930), ('umbrella_r', 4, 16, 16, 3, 0x3AB0),
    ('preum_l', 4, 16, 16, 3, 0x3C30), ('umbrella_l', 4, 16, 16, 3, 0x3DB0),
    ('splat', 16, 16, 10, 2, 0x3F30), ('exit', 8, 16, 13, 2, 0x41B0),
    ('fried', 14, 16, 14, 4, 0x4350), ('block', 16, 16, 10, 2, 0x4970),
    ('shrug_r', 8, 16, 10, 2, 0x4BF0), ('shrug_l', 8, 16, 10, 2, 0x4D30),
    ('ohno', 16, 16, 10, 2, 0x4E70), ('explode', 1, 32, 32, 3, 0x50F0),
]

MASKS = [
    ('bash_mask_r', 4, 16, 10, 0x0000), ('bash_mask_l', 4, 16, 10, 0x0050),
    ('mine_mask_r', 2, 16, 13, 0x00A0), ('mine_mask_l', 2, 16, 13, 0x00D4),
    ('explode_mask', 1, 16, 22, 0x0108),
]

DIGITS = [(str(i), 0x0134 + (9 - i) * 8) for i in range(10)]


def encode_planar(px, planes, w, h):
    rowbytes = (w + 7) // 8
    out = bytearray(planes * rowbytes * h)
    for y in range(h):
        for x in range(w):
            v = px[y * w + x]
            for p in range(planes):
                if v & (1 << p):
                    out[p * rowbytes * h + y * rowbytes + (x >> 3)] |= 1 << (7 - (x & 7))
    return bytes(out)


def encode_mask(bits, w, h):
    rowbytes = (w + 7) // 8
    out = bytearray(rowbytes * h)
    for y in range(h):
        for x in range(w):
            if bits[y * w + x]:
                out[y * rowbytes + (x >> 3)] |= 1 << (7 - (x & 7))
    return bytes(out)


def main():
    secs = dc.decompress_dat(os.path.join(ORIG, 'main.dat'))
    data = json.load(open(os.path.join(ROOT, 'build', 'main_data.json')))

    faults = 0

    def check(region, expected):
        nonlocal faults
        if expected == region:
            return
        faults += 1
        print('MISMATCH: len %d vs %d, first diff byte %d'
              % (len(region), len(expected),
                 next((i for i in range(min(len(region), len(expected)))
                       if region[i] != expected[i]), -1)))

    s0 = secs[0]
    for name, n, w, h, bpp, off in ANIMS:
        got = data['anims'][name]
        blob = b''
        for f in range(n):
            blob += encode_planar(got['frames'][f], bpp, w, h)
        sl = off + n * (w * h * bpp // 8)
        if s0[off:sl] != blob:
            faults += 1
            print('  anim %s FAIL (off %04x, len %d)' % (name, off, sl - off))

    s1 = secs[1]
    for name, n, w, h, off in MASKS:
        blob = b''
        for f in range(n):
            blob += encode_mask(data['masks'][name]['frames'][f], w, h)
        if s1[off:off + len(blob)] != blob:
            faults += 1
            print('  mask %s FAIL (off %04x, len %d)' % (name, off, len(blob)))
    for i in range(10):
        blob = encode_mask(data['digits'][str(i)], 8, 8)
        if s1[DIGITS[i][1]:DIGITS[i][1] + 8] != blob:
            faults += 1
            print('  digit %s FAIL' % i)

    s6 = secs[6]
    panel = encode_planar(data['panel'], 4, 320, 40)
    if s6[0:6400] != panel:
        faults += 1
        print('  panel FAIL')
    font_chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for i, c in enumerate(font_chars):
        off = 0x1900 + i * 0x30
        blob = encode_planar(data['font8x16'][c], 3, 8, 16)
        if s6[off:off + 48] != blob:
            faults += 1
            print('  font char %r FAIL' % c)

    s3, s4 = secs[3], secs[4]
    heads = [
        ('brown_bg', s3, 0x0000, encode_planar(data['brown_bg'], 2, 320, 104)),
        ('logo', s3, 0x2080, encode_planar(data['logo'], 4, 632, 94)),
        ('music_icon', s3, 0xEA50, encode_planar(data['music_icon'], 4, 64, 31)),
        ('fx_icon', s3, 0xEE30, encode_planar(data['fx_icon'], 4, 64, 31)),
        ('reel', s4, 0x5A00, encode_planar(data['reel'], 4, 16, 16)),
    ]
    for name, sec, off, blob in heads:
        if sec[off:off + len(blob)] != blob:
            faults += 1
            print('  %s FAIL' % name)
    for sname, off in [('f1', 0x9488), ('f2', 0xA2D4), ('f3', 0xB120),
                       ('rating', 0xBF6C), ('exit', 0xCDB8), ('f4', 0xDC04)]:
        blob = encode_planar(data['signs'][sname], 4, 120, 61)
        if s3[off:off + len(blob)] != blob:
            faults += 1
            print('  sign %s FAIL' % sname)
    for b in range(7):
        for f in range(8):
            loop = data['blinks'][b]
            blob = encode_planar(loop[f], 4, 32, 12)
            off = b * 0x600 + f * 192
            if s4[off:off + 192] != blob:
                faults += 1
                print('  blink b%d f%d FAIL' % (b, f))
    for f in range(16):
        blob = encode_planar(data['scroller_l'][f], 4, 48, 16)
        if s4[0x2A00 + f * 384:0x2A00 + (f + 1) * 384] != blob:
            faults += 1
            print('  scroller_l f%d FAIL' % f)
        blob = encode_planar(data['scroller_r'][f], 4, 48, 16)
        if s4[0x4200 + f * 384:0x4200 + (f + 1) * 384] != blob:
            faults += 1
            print('  scroller_r f%d FAIL' % f)
    for name, off in [('mayhem', 0x5A80), ('taxing', 0x5E4C),
                      ('tricky', 0x6218), ('fun', 0x65E4)]:
        blob = encode_planar(data['rating_signs'][name], 4, 72, 27)
        if s4[off:off + len(blob)] != blob:
            faults += 1
            print('  rating sign %s FAIL' % name)
    for code in range(0x21, 0x7F):
        blob = encode_planar(data['purple_font'][chr(code)], 3, 16, 16)
        off = 0x69B0 + (code - 0x21) * 0x60
        if s4[off:off + 0x60] != blob:
            faults += 1
            print('  purple font %r FAIL' % chr(code))
            if faults > 30:
                break

    print('ROUND-TRIP:', 'PASS' if faults == 0 else '%d faults' % faults)


if __name__ == '__main__':
    main()