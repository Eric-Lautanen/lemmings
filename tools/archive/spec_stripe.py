import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

for name in ['vgaspec0', 'vgaspec1', 'vgaspec2', 'vgaspec3']:
    secs = dc.decompress_dat(r'C:\github\Lemmings\original\%s.dat' % name)
    print(name, 'sections:', [len(s) for s in secs])
    for si, s in enumerate(secs):
        found = []
        for i in range(len(s) - 8):
            b = s[i]
            if (b >> 4) in (2, 5) and (b & 15) in (2, 5):
                run = []
                j = i
                while j < len(s) and len(run) < 16:
                    bj = s[j]
                    run.append(bj >> 4); run.append(bj & 15)
                    j += 1
                for k in range(len(run) - 5):
                    if all(run[k + t] == (2 if t % 2 == 0 else 5) for t in range(6)) or \
                       all(run[k + t] == (5 if t % 2 == 0 else 2) for t in range(6)):
                        found.append(i)
                        break
        if found:
            print('   sec%d: %d stripe regions, first: %s' % (si, len(found), found[:5]))