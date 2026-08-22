import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

secs = dc.decompress_dat(os.path.join(dc.ORIG, 'main.dat'))
data = secs[6]
extra = data[8000:]

def render(data, w):
    h = len(data) * 8 // w
    s = []
    for y in range(h):
        line = ''
        for x in range(w):
            byte = data[(y * w + x) // 8]
            line += '#' if (byte >> (7 - ((y * w + x) % 8))) & 1 else '.'
        s.append(line.rstrip('.'))
    return s

for w in [28, 16, 8, 32, 14, 7, 4]:
    if len(extra) * 8 % w != 0:
        continue
    print('=== width', w)
    for line in render(extra, w):
        print(line)
    print()