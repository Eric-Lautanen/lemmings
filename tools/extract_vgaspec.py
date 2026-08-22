import json
import os
import struct
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from datcommon import ORIG, BUILD, decompress_dat, unpack_planar


def rle2(section_data, start):
    """Second-level decompression. Returns list of sections (bytes)."""
    sections = []
    pos = start
    out = bytearray()
    while pos < len(section_data):
        b = section_data[pos]
        pos += 1
        if b == 0x80:
            sections.append(bytes(out))
            out = bytearray()
        elif b < 0x80:
            n = b + 1
            out += section_data[pos:pos + n]
            pos += n
        else:
            n = 257 - b  # 0xFF->2, 0xFE->3, ..., 0x81->128
            out += bytes([section_data[pos]]) * n
            pos += 1
    if out:
        sections.append(bytes(out))
    return sections


def extract_vgaspec(index):
    secs = decompress_dat(os.path.join(ORIG, 'vgaspec%d.dat' % index))
    assert len(secs) == 1, (index, [len(s) for s in secs])
    data = secs[0]
    vga_pal = [tuple(data[3 * i:3 * i + 3]) for i in range(8)]
    ega = data[24:40]
    sections = rle2(data, 40)
    assert len(sections) == 4, (index, [len(s) for s in sections])
    assert all(len(s) == 14400 for s in sections), (index, [len(s) for s in sections])
    px = []
    for s in sections:
        px += unpack_planar(s, 3, 960, 40)
    return vga_pal, px


def main():
    palettes = {}
    for i in range(4):
        pal, px = extract_vgaspec(i)
        palettes[i] = [list(c) for c in pal]
        counts = {}
        for v in px:
            counts[v] = counts.get(v, 0) + 1
        print('vgaspec%d: palette =' % i, pal)
        print('  pixel value counts:', dict(sorted(counts.items())))
        try:
            from PIL import Image
            img = Image.new('RGB', (960, 160))
            out = img.load()
            for y in range(160):
                for x in range(960):
                    v = px[y * 960 + x]
                    c = pal[v] if 1 <= v <= 7 else (0, 0, 0)
                    out[x, y] = c
            os.makedirs(os.path.join(BUILD, 'preview'), exist_ok=True)
            img.save(os.path.join(BUILD, 'preview', 'vgaspec%d.png' % i))
        except Exception as e:
            print('  (PIL preview skipped: %s)' % e)
        with open(os.path.join(BUILD, 'vgaspec%d.json' % i), 'w') as f:
            json.dump({'palette': [list(c) for c in pal], 'bitmap': px}, f)
        print('  saved build/vgaspec%d.json' % i)


if __name__ == '__main__':
    main()
