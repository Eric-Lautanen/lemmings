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

# search each section as 4bpp (2 px per byte) for the umbrella canopy stripe signature:
# a row containing 5,2,5,2,5,2 pattern (red green red green red green)
for si, s in enumerate(secs):
    found = []
    for i in range(len(s) - 8):
        b = s[i]
        if (b >> 4) in (2, 5) and (b & 15) in (2, 5):
            # check a run of alternating 2/5 over next few bytes
            run = []
            j = i
            while j < len(s) and len(run) < 16:
                bj = s[j]
                run.append(bj >> 4); run.append(bj & 15)
                j += 1
            # find alternating 2,5,2,5.. sequence
            for k in range(len(run) - 5):
                if all(run[k + t] == (2 if t % 2 == 0 else 5) for t in range(6)) or \
                   all(run[k + t] == (5 if t % 2 == 0 else 2) for t in range(6)):
                    found.append((i, k, j))
                    break
    print('sec%d: %d candidate stripe regions' % (si, len(found)))
    for off, k, j in found[:5]:
        print('   byte offset %d (bit %d) - %d' % (off, k, j))