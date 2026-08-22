import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = dc.ORIG
secs_all = []
for f in range(10):
    secs = dc.decompress_dat(r'%s\level%03d.dat' % (ORIG, f))
    for s in range(8):
        data = secs[s]
        rate, lems, rescue, time = (int.from_bytes(data[i:i + 2], 'big') for i in (0, 2, 4, 6))
        skills = [int.from_bytes(data[8 + 2 * i:10 + 2 * i], 'big') for i in range(8)]
        startx, gfxset = int.from_bytes(data[0x18:0x1A], 'big'), int.from_bytes(data[0x1A:0x1C], 'big')
        name = data[0x7E0:0x800].rstrip(b' ').decode('ascii', 'replace')
        secs_all.append((f, s, rate, lems, rescue, time, skills, startx, gfxset, name))

print('sections with rate 50, lems 10, 10 floaters:')
for r in secs_all:
    f, s, rate, lems, rescue, time, skills, startx, gfxset, name = r
    if rate == 50 and lems == 10 and skills[1] == 10:
        print(' file%d sec%d rescue=%d time=%d skills=%s  %r' % (f, s, rescue, time, skills, name))

print()
print('sections with time >= 5:')
for r in secs_all:
    f, s, rate, lems, rescue, time, skills, startx, gfxset, name = r
    if time >= 5:
        print(' file%d sec%d rate=%d lems=%d rescue=%d time=%d skills=%s  %r' % (f, s, rate, lems, rescue, time, skills, name))