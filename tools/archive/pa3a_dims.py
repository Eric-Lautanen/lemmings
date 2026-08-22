import glob
from PIL import Image
import os
for f in sorted(glob.glob('[0-9]*.png'), key=lambda s: int(s.split('.')[0])):
    im = Image.open(f)
    colors = im.getcolors(maxcolors=1 << 20)
    ncolors = len(colors) if colors else '>1M'
    print(f, im.size, im.mode, ncolors)
