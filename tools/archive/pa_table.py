import os
from PIL import Image

d = r'C:\Users\ericl\AppData\Local\Temp\opencode'

def isgreen(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def glyph_rows(px, gx, y0=328, w=12):
    x = 2 * gx
    rows = []
    for dy in range(0, 22):
        line = ''.join('#' if isgreen(px, x + dx, y0 + dy) else '.' for dx in range(0, w))
        rows.append(line)
    return rows

def sig(rows):
    return tuple(rows)

shots = {
    'ref': Image.open(r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png').convert('RGB'),
    '6c9': Image.open(os.path.join(d, 'pa_6c9.png')).convert('RGB'),
    'd30': Image.open(os.path.join(d, 'pa_d30.png')).convert('RGB'),
    'dc9': Image.open(os.path.join(d, 'pa_dc9.png')).convert('RGB'),
    'ff5': Image.open(os.path.join(d, 'pa_ff5.png')).convert('RGB'),
}

fields = {
    'A(113,121,129)': [113,121,129],
    'B(145)':         [145],
    'C(186,193)':     [186,193],
    'D(209,217,225)': [209,217,225],
    'E(249,258,265,273)': [249,258,265,273],
    'F(289,297,305,313)': [289,297,305,313],
}

# collect glyphs -> first-seen name
glyphs = []
seen = {}

for sname, im in shots.items():
    px = im.load()
    y0map = {'ref': 328, '6c9': 328, 'd30': 328, 'dc9': 328, 'ff5': 328}
    y0 = y0map[sname]
    for label, xs in fields.items():
        for gx in xs:
            rows = glyph_rows(px, gx, y0)
            # skip blank
            if not any('#' in r for r in rows):
                continue
            s = sig(rows)
            if s in seen:
                name = seen[s]
            else:
                name = 'G%d' % len(glyphs)
                seen[s] = name
                glyphs.append((name, rows))
            glyphs.append((None, None))  # marker

# print unique glyphs art
for name, rows in glyphs:
    if rows is None:
        continue
    print('### %s' % name)
    for r in rows:
        print('   ' + r.rstrip())
    print()

# value table per slot: glyph name
print('=== VALUE TABLE ===')
for sname, im in shots.items():
    px = im.load()
    row = []
    for label, xs in fields.items():
        val = []
        for gx in xs:
            rows = glyph_rows(px, gx)
            if not any('#' in r for r in rows):
                val.append('  ')
            else:
                val.append(seen[sig(rows)])
        row.append('%s= %s' % (label.split('(')[0], ' '.join(val)))
    print('%-4s | %s' % (sname, ' | '.join(row)))