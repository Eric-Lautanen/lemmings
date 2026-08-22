import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat

sec = decompress_dat(r'C:\github\Lemmings\original\level009.dat')[6]
print('section name:', sec[0x7E0:0x800].rstrip(b' '))
print()
print('idx  b0 b1 b2 b3 | parse_lvl: x,y,mods,tid | extract.js: x,y,flags,id')
for i in range(0, 60):
    o = 0x120 + i * 4
    b0, b1, b2, b3 = sec[o], sec[o+1], sec[o+2], sec[o+3]
    if b0 == 0xFF and b1 == 0xFF and b2 == 0xFF and b3 == 0xFF:
        print(f'{i:3d}  FF FF FF FF (END)'); break
    # parse_lvl
    mods = b0 >> 5
    x = ((b0 & 0x0F) << 8) | b1
    y9 = (b2 << 1) | (b3 >> 7)
    if y9 >= 256: y9 -= 512
    y = y9 - 4
    tid = (b3 & 63) + (64 if (b0 & 16) else 0)
    # extract.js
    x2 = ((b0 & 0x0F) << 8) | b1
    yv = ((b2 & 0xFF) << 1) | (b3 >> 7)
    y2 = yv - (516 if yv > 256 else 4)
    fl = b0 >> 5
    id2 = b3 & 0x3F
    same = (x == x2 and y == y2 and mods == fl and tid == id2)
    mark = '' if same else '   <-- DIFFERS'
    print(f'{i:3d}  {b0:02x} {b1:02x} {b2:02x} {b3:02x} | x={x-16:5d} y={y:4d} mods={mods} tid={tid:2d} | x={x2-16:5d} y={y2:4d} fl={fl} id={id2:2d}{mark}')