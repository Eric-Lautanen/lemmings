import os, sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
from datcommon import decompress_dat
from parse_lvl import parse_level
from datcommon import ORIG

lv = parse_level(os.path.join(ORIG, 'level009.dat'), 6)
print('name=%r' % lv['name'])
print('objs:')
for o in lv['objs']:
    print('  x=%4d y=%3d id=%2d mods=0x%02x b7=0x%02x' % (o[0], o[1], o[2], o[3], o[4]))
print('terrain (%d):' % len(lv['terrains']))
for i, t in enumerate(lv['terrains']):
    print('  [%3d] id=%2d x=%4d y=%3d mods=%d' % (i, t[3], t[0], t[2], t[1]))