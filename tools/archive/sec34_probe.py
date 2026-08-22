import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
pos = 0
secs = []
while pos < len(main):
    comp_size = int.from_bytes(main[pos + 6:pos + 10], 'big')
    secs.append(dc.decompress_section(main[pos:pos + comp_size]))
    pos += comp_size

# sec3 and sec4: scan as 4bpp (planar? packed?) looking for a yellow+blue+green cluster
# digger icon signature: a 3x4 block of yellow (4) near blue (1) with green (2) above
for si in [3, 4]:
    s = secs[si]
    # try packed 4bpp (2 px/byte)
    hits = []
    for i in range(len(s) - 2):
        b0, b1 = s[i], s[i + 1]
        v = [b0 >> 4, b0 & 15, b1 >> 4, b1 & 15]
        # look for Y (4) adjacent to B (1) adjacent to G (2)
        for k in range(2):
            if v[k] == 4 and v[k + 1] == 1 and k + 2 < 4 and v[k + 2] == 2:
                hits.append(i)
                break
            if v[k] == 1 and v[k + 1] == 4 and k + 2 < 4 and v[k + 2] == 2:
                hits.append(i)
                break
    print('sec%d packed-4bpp Y/B/G hits: %d, first: %s' % (si, len(hits), hits[:10]))
    # try planar 4bpp: 4 planes
    W = 160
    H = len(s) * 8 // (4 * W)
    print('   planar 4bpp W=%d H=%d' % (W, H))