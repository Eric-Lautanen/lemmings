import numpy as np, json, os
from PIL import Image

# world y 28..39 -> gif rows r = y*1.39375 => 39.0..54.4
# world x 704..793 -> gif cols c = (x-489)*1.5625 => 335.9..475
# direct per-frame pixel inspection, no stitching
im0 = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3a.gif')
for fi in [0, 20, 40, 60, 100, 150, 200]:
    im0.seek(fi)
    im = np.array(im0.convert('RGB')).astype(int)
    # region rows 39..54, cols 336..475
    reg = im[39:55, 336:476]
    bg1 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==51)
    bg2 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==0)
    dark = reg.max(axis=2) < 30
    terr = ~(bg1 | bg2 | dark)
    print(f'f{fi:3d}: terrain pixels in rows39-54 x704-793 window: {terr.sum()} (of {terr.size}), rows with pixels: {[i for i in range(16) if terr[i].any()][:10]}')

# also rows 21..27 (world) -> gif rows 29.3..37.6, cols 336..475
im0.seek(0)
im = np.array(im0.convert('RGB')).astype(int)
print('\nframe 0 rows 29..37 cols 336..475 (world y21-27 x704-793):')
reg = im[29:38, 336:476]
bg1 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==51)
bg2 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==0)
terr = ~(bg1 | bg2 | (reg.max(axis=2)<30))
for i in range(9):
    row = terr[i]
    if row.any():
        idx = np.where(row)[0]
        print(f'  gifrow {29+i:2d} (world y{(29+i)/1.39375:.0f}): cols {idx.min()+336}-{idx.max()+336} n={row.sum()}')
    else:
        print(f'  gifrow {29+i:2d} (world y{(29+i)/1.39375:.0f}): EMPTY')

# world x 505..703, rows y21-27 -> gif cols (505..703-489)*1.5625 = 25..334, rows 29..37
print('\nframe 0 rows 29..37 cols 25..334 (world y21-27 x505-703):')
reg = im[29:38, 25:335]
bg1 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==51)
bg2 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==0)
terr = ~(bg1 | bg2 | (reg.max(axis=2)<30))
for i in range(9):
    row = terr[i]
    print(f'  gifrow {29+i:2d}: terrain px = {row.sum()}')

im0b = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3b.gif')
im0b.seek(40)
imb = np.array(im0b.convert('RGB')).astype(int)
reg = imb[39:55, 336:476]
bg1 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==51)
bg2 = (reg[:,:,0]==0)&(reg[:,:,1]==0)&(reg[:,:,2]==0)
terr = ~(bg1 | bg2 | (reg.max(axis=2)<30))
print(f'\nfun3b f40: terrain pixels rows39-54 x704-793: {terr.sum()}')