import os, sys, json
sys.path.insert(0, r'C:\github\Lemmings\tools')
from parse_lvl import parse_level
from datcommon import ORIG

lv = parse_level(os.path.join(ORIG, 'level009.dat'), 6)
print('=== DOS level009.dat sec6 (Fun 3) ===')
print('name=%r rate=%d lems=%d rescue=%d time=%d skills=%s startx=%d gfxset=%d' % (
    lv['name'], lv['rate'], lv['lems'], lv['rescue'], lv['time'], lv['skills'], lv['startx'], lv['gfxset']))
print('objs:')
for o in lv['objs']:
    print('  x=%4d y=%3d id=%2d mods=0x%02x b7=0x%02x' % (o[0], o[1], o[2], o[3], o[4]))
print('terrain (%d):' % len(lv['terrains']))
for i, t in enumerate(lv['terrains']):
    print('  [%3d] id=%2d x=%4d y=%3d mods=%d' % (i, t[3], t[0], t[2], t[1]))
print('steel:', lv['steels'])

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lvp = assets['levels'][78]
print('\n=== PORT levels[78] ===')
print('name=%r gfxset=%d startx=%d' % (lvp['name'], lvp['gfxset'], lvp['startx']))
print('objs:')
for o in lvp['objs']:
    print('  x=%4d y=%3d id=%2d mods=0x%02x disp=0x%02x' % (o[0], o[1], o[2], o[3], o[4]))
print('terrain (%d):' % len(lvp['terrain']))
for i, t in enumerate(lvp['terrain']):
    print('  [%3d] id=%2d x=%4d y=%3d mods=%d' % (i, t[3], t[0], t[2], t[1]))
print('steel:', lvp['steel'])

print('\n=== DIFF ===')
if [tuple(o) for o in lv['objs']] == [tuple(o) for o in lvp['objs']]:
    print('objs: IDENTICAL')
else:
    print('objs: DIFFER')
if [tuple(t) for t in lv['terrains']] == [tuple(t) for t in lvp['terrain']]:
    print('terrain: IDENTICAL (%d pieces)' % len(lv['terrains']))
else:
    print('terrain: DIFFER')
    a, b = lv['terrains'], lvp['terrain']
    for i in range(max(len(a), len(b))):
        ta = a[i] if i < len(a) else None
        tb = b[i] if i < len(b) else None
        if ta != tb:
            print('  [%3d] DOS: %s | PORT: %s' % (i, ta, tb))
print('steel equal:', lv['steels'] == lvp['steel'])