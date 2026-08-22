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

PAL = [(0,0,0),(64,64,224),(0,176,0),(240,208,208),(176,176,0),(240,32,32),(128,128,128),(240,240,96)]

# sec3 packed 4bpp around hit 2343: dump a region as art
def dump_packed(s, off, w, h, label):
    print('=== %s (byte %d) ===' % (label, off))
    for y in range(h):
        row = ''
        for x in range(w):
            idx = off + (y * w + x) // 2
            if idx >= len(s):
                row += 'x'
                continue
            b = s[idx]
            v = b >> 4 if (y * w + x) % 2 == 0 else b & 15
            row += '.YGWB Rg?1234567'[v]
        print(row)

dump_packed(secs[3], 2300, 64, 24, 'sec3 @2300')
dump_packed(secs[3], 6460, 64, 24, 'sec3 @6460')
dump_packed(secs[4], 1814, 64, 24, 'sec4 @1814')