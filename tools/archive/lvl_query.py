import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

ORIG = dc.ORIG
secs_all = []
for f in range(10):
    data = open(r'%s\level%03d.dat' % (ORIG, f), 'rb').read()
    for s in range(8):
        off = s * 32
        rate, lems, rescue, time = data[off], data[off + 2], data[off + 4], data[off + 6]
        skills = list(data[off + 8:off + 22])
        startx, gfxset = data[off + 0x18], data[off + 0x1A]
        secs_all.append((f, s, rate, lems, rescue, time, skills, startx, gfxset))

print('sections with rate 50, lems 10, 10 floaters:')
for r in secs_all:
    f, s, rate, lems, rescue, time, skills, startx, gfxset = r
    if rate == 50 and lems == 10 and skills[1] == 10:
        print(' file%d sec%d rescue=%d time=%d skills=%s' % (f, s, rescue, time, skills))
print()
print('sections with time >= 5:')
for r in secs_all:
    f, s, rate, lems, rescue, time, skills, startx, gfxset = r
    if time >= 5:
        print(' file%d sec%d rate=%d lems=%d rescue=%d time=%d skills=%s' % (f, s, rate, lems, rescue, time, skills))