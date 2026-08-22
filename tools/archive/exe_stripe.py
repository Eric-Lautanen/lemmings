import sys

for name in ['vgalemmi.exe', 'cgalemmi.exe', 'tgalemmi.exe']:
    data = open(r'C:\github\Lemmings\original\%s' % name, 'rb').read()
    found = []
    for i in range(len(data) - 8):
        b = data[i]
        if (b >> 4) in (2, 5) and (b & 15) in (2, 5):
            run = []
            j = i
            while j < len(data) and len(run) < 16:
                bj = data[j]
                run.append(bj >> 4); run.append(bj & 15)
                j += 1
            for k in range(len(run) - 5):
                if all(run[k + t] == (2 if t % 2 == 0 else 5) for t in range(6)) or \
                   all(run[k + t] == (5 if t % 2 == 0 else 2) for t in range(6)):
                    found.append(i)
                    break
    print(name, len(data), 'stripe candidates:', len(found), found[:5])