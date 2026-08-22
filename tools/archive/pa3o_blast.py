import sys, os
sys.path.insert(0, r'C:\github\Lemmings')
import tools.datcommon as dc

CANDIDATES = {}
# canonical 6x11 rows for %, 1, S, 0, 5, 9, 3 (bit set = pixel)
PERCENT = ['111111','111111','000011','000011','000110','000110','001100','001100','001100','001100','001100']
ONE     = ['111111','111111','111111','001100','001100','001100','001100','001100','001100','001100','001100']
SGLYPH  = ['110011','110011','000111','000110','001110','001100','011100','011000','111000','110011','110011']
ZERO    = ['011110','111111','110011','110011','110011','110011','110011','110011','111111','111111','011110']
FIVE    = ['111111','111111','110000','110000','111100','111111','000011','110011','111111','111111','011110']
NINE    = ['011110','111111','110011','000011','000011','000110','000110','000011','110011','111111','111111']
THREE   = ['111111','111111','110000','110000','111100','111100','110000','110000','111111','111111','111111']

def variants(rows):
    out = []
    for rev_order in (False, True):
        r = rows[::-1] if rev_order else rows
        for leftfirst in (True, False):
            vals = []
            for row in r:
                v = 0
                for i, ch in enumerate(row):
                    if ch == '1':
                        v |= 1 << (i if leftfirst else (5 - i))
                vals.append(v)
            out.append(bytes(vals))
    return out

def scan(data, pats, label):
    hits = []
    for p in pats:
        i = 0
        while True:
            i = data.find(p, i)
            if i < 0: break
            hits.append((p.hex(), i))
            i += 1
    # also try pats with each row shifted to high bits of a byte (<<2)
    for p in pats:
        p2 = bytes(b << 2 for b in p)
        i = 0
        while True:
            i = data.find(p2, i)
            if i < 0: break
            hits.append((p2.hex() + ' <<2', i))
            i += 1
    if hits:
        print(f'  {label}: {hits}')

print('== main.dat sections ==')
secs = dc.decompress_dat(os.path.join(dc.ORIG, 'main.dat'))
gm = {'%': PERCENT, '1': ONE, 'S': SGLYPH, '0': ZERO, '5': FIVE, '9': NINE, '3': THREE}
for idx, s in enumerate(secs):
    for name, rows in gm.items():
        scan(s, variants(rows), f'sec{idx} {name}')

print('== other dat files ==')
for fn in ['oddtable.dat', 'cgamain.dat', 'tgamain.dat', 'vgagr0.dat', 'vgagr1.dat', 'vgagr2.dat', 'vgagr3.dat', 'vgagr4.dat', 'level000.dat', 'level001.dat']:
    path = os.path.join(dc.ORIG, fn)
    if not os.path.exists(path): continue
    d = open(path, 'rb').read()
    for name, rows in gm.items():
        scan(d, variants(rows), f'{fn} {name}')