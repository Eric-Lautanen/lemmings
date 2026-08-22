import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG, decompress_dat, unpack_planar
from extract_graphics import parse_groundxo
from PIL import Image

SCREENS = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp',
                       'opencode', 'lemmings-work', 'screens')


def parse_level(path, sec=0):
    data = decompress_dat(path)[sec]
    rate, lems, rescue, time = [int.from_bytes(data[i:i + 2], 'big') for i in (0, 2, 4, 6)]
    skills = [int.from_bytes(data[8 + 2 * i:10 + 2 * i], 'big') for i in range(8)]
    startx = int.from_bytes(data[0x18:0x1A], 'big')
    gfxset = int.from_bytes(data[0x1A:0x1C], 'big')
    objs = []
    for i in range(32):
        e = data[0x20 + i * 8:0x28 + i * 8]
        xr = int.from_bytes(e[0:2], 'big')
        yr = int.from_bytes(e[2:4], 'big')
        oid = int.from_bytes(e[4:6], 'big')
        if xr == 0 and yr == 0 and oid == 0:
            continue
        # Lemmix Level.Loader: Left = word - 16 (no alignment rounding),
        # Top = word as-is, Identifier = low nibble of byte 5
        objs.append((xr - 16, yr, e[5] & 15, e[6], e[7]))
    terrains = []
    for i in range(400):
        e = data[0x120 + i * 4:0x124 + i * 4]
        if int.from_bytes(e, 'big') == 0xFFFFFFFF:
            break
        # Lemmix Level.Loader (authoritative DOS decode):
        # x = ((b0 & 15) << 8) + b1 - 16 ; y = signed9(b2 << 1 | b3 >> 7) - 4
        # piece = b3 & 63 (b0 bit 4 is ignored by the original game)
        # flags = b0 >> 5: 1 = erase, 2 = invert (flip vertical), 4 = no-overwrite
        mods = e[0] >> 5
        x = ((e[0] & 0x0F) << 8) | e[1]
        y = (e[2] << 1) | ((e[3] & 0x80) >> 7)
        if y >= 256:
            y -= 512
        y -= 4
        tid = e[3] & 63
        terrains.append((x - 16, mods, y, tid))
    steels = []
    for i in range(32):
        e = data[0x760 + i * 4:0x764 + i * 4]
        if e == b'\x00\x00\x00\x00':
            break
        sx = ((e[0] * 2 + (e[1] >> 7)) * 4) - 16
        sy = (e[1] & 0x7F) * 4
        sw = ((e[2] >> 4) + 1) * 4
        sh = ((e[2] & 0x0F) + 1) * 4
        steels.append((sx, sy, sw, sh))
    name = data[0x7E0:0x800].rstrip(b' ').decode('ascii', 'replace')
    return dict(rate=rate, lems=lems, rescue=rescue, time=time, skills=skills,
                startx=startx, gfxset=gfxset, name=name, objs=objs,
                terrains=terrains, steels=steels)


def dump_level(idx):
    lv = parse_level(os.path.join(ORIG, 'level%03d.dat' % idx))
    print('=== level%03d %r ===' % (idx, lv['name']))
    print(' rate=%d lems=%d rescue=%d time=%d skills=%s startx=%d gfxset=%d' % (
        lv['rate'], lv['lems'], lv['rescue'], lv['time'], lv['skills'], lv['startx'], lv['gfxset']))
    print(' objects:', lv['objs'])
    print(' terrain count:', len(lv['terrains']), ' steel:', lv['steels'])


def main():
    for i in range(10):
        dump_level(i)


if __name__ == '__main__':
    main()
