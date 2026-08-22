import json, sys, os, re
sys.path.insert(0, r'C:\github\Lemmings\tools')
from parse_lvl import parse_level
from datcommon import ORIG

src = open(r'C:\github\Lemmings\tools\build_bundle.py').read()
m = re.search(r'MENU_ORDER = \[(.*?)\n\]', src, re.S)
rows = re.findall(r"\('(\w+)',\s*(\d+),\s*(\d+),\s*'(\w+)'\)", m.group(1))
odd = open(r'C:\github\Lemmings\original\oddtable.dat', 'rb').read()
stats = json.load(open(r'C:\github\Lemmings\tools\dos_stats.json'))
mism = []
for rank, num, sec, src2 in rows:
    num = int(num); sec = int(sec)
    lv = parse_level(os.path.join(ORIG, 'level%03d.dat' % (sec // 8)), sec % 8)
    if src2 == 'odd':
        rec = odd[sec * 56:(sec + 1) * 56]
        vals = [int.from_bytes(rec[j:j + 2], 'big') for j in range(0, 24, 2)]
        got = dict(rate=vals[0], lems=vals[1], save=vals[2], time=vals[3])
        name = rec[0x18:0x38].rstrip(b' ').decode('ascii', 'replace')
    else:
        name = lv['name']
        got = dict(rate=lv['rate'], lems=lv['lems'], save=lv['rescue'], time=lv['time'])
    pack = {'Fun': 473, 'Tricky': 474, 'Taxing': 475, 'Mayhem': 476}[rank]
    want = stats['%d/%d' % (pack, num)]
    if got != want:
        mism.append((rank, num, sec, src2, name.strip(), got, want))
print('MISMATCHES:', len(mism))
for rank, num, sec, src2, n, g, w in mism:
    print('  %s %2d sec=%2d %-5s %-36r web=%s lldb=%s' % (rank, num, sec, src2, n, g, w))