import sys, os
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc

secs = dc.decompress_dat(os.path.join(dc.ORIG, 'main.dat'))
data = secs[6]
w, h = 320, 50
plane_size = w // 8
data = data[:8000]
grid = []
for y in range(h):
    row = data[y * plane_size * 4:(y + 1) * plane_size * 4]
    line = []
    for bit in range(w):
        c = 0
        for p in range(4):
            byte = row[p * plane_size + bit // 8]
            if byte >> (7 - (bit % 8)) & 1:
                c |= 1 << p
        line.append(c)
    grid.append(line)

# print rows 0..49, but only columns 90..319 (strip area), 2x scale by repeating rows
for y in range(h):
    s = ''.join('#' if grid[y][x] else '.' for x in range(90, 320))
    if '#' in s:
        print('%2d' % y, s)