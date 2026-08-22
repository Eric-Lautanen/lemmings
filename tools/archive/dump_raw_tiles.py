import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat

ORG = r'C:\github\Lemmings\original'
terr, obj = decompress_dat(os.path.join(ORG, 'vgagr3.dat'))

def dump_image(label, img, w, h):
    rb = (w + 7) // 8
    ST = rb * h
    print(f'--- {label}: w={w} h={h} rb={rb} ST={ST} img={img} (region {img}..{img + 4*ST - 1}) ---')
    print('fs row: plane0 bytes (pmajor), plane1, plane2, plane3')
    for y in range(h):
        parts = []
        for p in range(4):
            off = img + p * ST + y * rb
            parts.append(' '.join(f'{b:02x}' for b in terr[off:off + rb]))
        print(f'y{y:2d}: ' + ' | '.join(parts))
    print()

dump_image('t0', 0, 64, 34)
dump_image('t1', 1088, 48, 4)