import struct

main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
print('main.dat size', len(main))

# main.dat: 10 sections x 0x1A90? Let's find the panel section (320x40 4bpp = 6400 bytes)
# Try each section offset for a region matching known panel art.
# Panel = bottom 40 rows of screen. In many Lemmings formats, the panel is one section.
# Search for the panel: the well-window area x3..13 (well 1 window) should be black (value 0).
# Let's brute force: find a 6400-byte blob where rows 0..39 decode to pixels with values 0..6 only.
import itertools

sec_size = 0x1A90  # common section size? try to detect by scanning
# Actually main.dat sections are 0x1A90? Let's just scan every alignment.

def px4(b, x, y, rowbytes):
    # 4bpp: 2 pixels per byte, high nibble first
    o = y * rowbytes + x // 2
    v = b[o]
    return (v >> 4) if (x % 2 == 0) else (v & 0xF)

def probe(off, rowbytes, label):
    vals = set()
    # check region: y rows 0..39, x 0..319 -> sample a grid
    for y in range(0, 40, 3):
        for x in range(0, 320, 11):
            vals.add(px4(main, off + x, y, rowbytes))
    print(f'{label}: off={off:#x} sample values={sorted(vals)}')

# panel might start at a section boundary. main.dat = 10 files? no, it's one blob of sections.
# Try offsets every 0x10 within first 64KB, find blobs where 6400 bytes only use values 0..7
found = []
for off in range(0, len(main) - 6400, 8):
    ok = True
    vals = set()
    for i in range(0, 6400, 79):
        v = main[off + i]
        vals.add(v & 0xF); vals.add(v >> 4)
        if any(vv > 8 for vv in vals):
            ok = False
            break
    if ok and len(vals) > 3:
        found.append((off, sorted(vals)))
print('candidate panel offsets (values<=8):', found[:30])