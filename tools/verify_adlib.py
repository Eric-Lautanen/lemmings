"""Verify adlib_data.js: base64 decodes byte-identical to original/adlib.dat."""
import io
import re
import base64
import os
import sys

sys.path.insert(0, 'tools')
from datcommon import ORIG, decompress_dat

img = decompress_dat(os.path.join(ORIG, 'adlib.dat'))[0]
js = io.open('adlib_data.js', encoding='utf-8').read()
m = re.match(r"window\.ADLIB_DRIVER_B64='([A-Za-z0-9+/=]+)';\n?$", js.strip())
assert m, 'format wrong'
dec = base64.b64decode(m.group(1))
print('decoded len:', len(dec), '| source len:', len(img))
print('byte-identical to original/adlib.dat decode:', dec == img)
print('strings present:', all(x in dec for x in
      [b'AdLib Music by Sound Images', b'~ Lemmings ~', b'A - Awesome']))
