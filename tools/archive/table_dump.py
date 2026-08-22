import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat

ORG = r'C:\github\Lemmings\original'
ground = open(os.path.join(ORG, 'ground3o.dat'), 'rb').read()
terr, obj = decompress_dat(os.path.join(ORG, 'vgagr3.dat'))
print('terr len:', len(terr))

prev_end = 0
for i in range(64):
    o = 448 + i * 8
    w = ground[o]; h = ground[o + 1]
    img = int.from_bytes(ground[o+2:o+4], 'little')
    maskp = int.from_bytes(ground[o+4:o+6], 'little')
    vga = int.from_bytes(ground[o+6:o+8], 'little')
    if w == 0 or h == 0:
        print(f'[{i:2d}] EMPTY')
        prev_end = None
        continue
    rb = (w + 7) // 8
    size = 4 * rb * h
    gap = img - prev_end if prev_end is not None else 0
    print(f'[{i:2d}] w={w:3d} h={h:3d} img={img:6d} maskp={maskp:6d} vga={vga:6d} size={size:6d} end={img+size:6d} gap={gap}')
    prev_end = img + size