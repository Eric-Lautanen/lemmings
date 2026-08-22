import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc
import numpy as np
from PIL import Image

secs = dc.decompress_dat(r'C:\github\Lemmings\original\main.dat')
s6 = secs[6]
font_chars = '%0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ'

def unpack_planar(d, bpp, w, h):
    rb = (w + 7) // 8
    px = np.zeros((h, w), dtype=int)
    for y in range(h):
        for x in range(w):
            v = 0
            for p in range(bpp):
                if d[p * rb * h + y * rb + (x >> 3)] & (0x80 >> (x & 7)):
                    v |= 1 << p
            px[y, x] = v
    return px

fonts = {}
for i, c in enumerate(font_chars):
    fonts[c] = unpack_planar(s6[0x1900 + i * 0x30:], 3, 8, 16)

# v002 strip: OUT@112, '9'@144, IN@184, '0'@216, '%'@224, TIME@248, '4'@288, '-'@296, '4'@304, '3'@312
layout = [('O', 112), ('U', 120), ('T', 128), ('9', 144), ('I', 184), ('N', 192),
          ('0', 216), ('%', 224), ('T', 248), ('I', 256), ('M', 264), ('E', 272),
          ('4', 288), ('-', 296), ('4', 304), ('3', 312)]

cap = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB'))[160:200, :, :]

from collections import Counter
hist = {v: Counter() for v in range(8)}
for ch, gx in layout:
    g = fonts[ch]
    for yy in range(16):
        for xx in range(8):
            v = g[yy, xx]
            col = tuple(cap[yy, gx + xx])
            hist[v][col] += 1
for v in range(8):
    print('value %d:' % v, hist[v].most_common(6))
