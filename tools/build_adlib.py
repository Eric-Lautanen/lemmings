"""Generate web/adlib_data.js from original/adlib.dat.

The file is a single base64 blob consumed by web/adlib.js as
window.ADLIB_DRIVER_B64 - the decompressed AdLib sound driver + music/SFX
data image (Sound Images 1991), executed step-for-step by the JS port.
"""
import os
import sys
import base64

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datcommon import ORIG, decompress_dat


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sections = decompress_dat(os.path.join(ORIG, 'adlib.dat'))
    if len(sections) != 1:
        print('warning: expected 1 section, got %d' % len(sections))
    img = sections[0]
    b64 = base64.b64encode(img).decode()
    out = os.path.join(root, 'adlib_data.js')
    with open(out, 'w') as fh:
        fh.write("window.ADLIB_DRIVER_B64='" + b64 + "';")
    print('adlib_data.js written: image %d bytes -> %d base64 chars'
          % (len(img), len(b64)))


if __name__ == '__main__':
    main()
