from PIL import Image

mask = [l.strip().replace('1', '#').replace('0', '.') for l in open(r'C:\Users\ericl\AppData\Local\Temp\opencode\pa5_stripmask.txt')]
assert len(mask) == 16 and all(len(r) == 320 for r in mask), (len(mask), len(mask[0]))

im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og_004.png').convert('L')
px = im.load()

diff = []
for y in range(16):
    ref = ''.join('#' if px[x, 160 + y] != 0 else '.' for x in range(320))
    got = mask[y]
    for x in range(320):
        if ref[x] != got[x]:
            diff.append((y, x))
    if ref != got:
        # print a compact diff region
        segs = []
        for x in range(320):
            if ref[x] != got[x]:
                segs.append('%d:%s%s' % (x, ref[x], got[x]))
        print('row', y, 'diffs:', len(segs), segs[:30])

print('total diffs:', len(diff))
# also verify the reference text is entirely within the drawn areas
# print the ref rows for eyeballing
for y in range(16):
    print('%02d %s' % (y, ''.join('#' if px[x, 160 + y] != 0 else '.' for x in range(0, 320))))
