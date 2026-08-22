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

shots = {
    'ref': Image.open(r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png').convert('RGB'),
    '6c9': Image.open(os.path.join(d, 'pa_6c9.png')).convert('RGB'),
    'd30': Image.open(os.path.join(d, 'pa_d30.png')).convert('RGB'),
    'dc9': Image.open(os.path.join(d, 'pa_dc9.png')).convert('RGB'),
    'ff5': Image.open(os.path.join(d, 'pa_ff5.png')).convert('RGB'),
}
fields = {
    'A': [113,121,129], 'B': [145], 'C': [186,193],
    'D': [209,217,225], 'E': [249,258,265,273], 'F': [289,297,305,313],
}

def sig(rows): return tuple(rows)

seen = {}
order = []

# collect: each shot/glyph instance
instances = []  # (shot, field, idx, gx, glyphname)
for sname, im in shots.items():
    px = im.load()
    for label, xs in fields.items():
        for idx, gx in enumerate(xs):
            rows = glyph_rows(px, gx)
            if not any('#' in r for r in rows):
                continue
            s = sig(rows)
            if s not in seen:
                seen[s] = 'G%d' % len(order)
                order.append((s, rows))
            instances.append((sname, label, idx, gx, seen[s]))

print('=== UNIQUE GLYPHS ===')
for i, (s, rows) in enumerate(order):
    name = 'G%d' % i
    print('### %s' % name)
    for r in rows:
        print('   ' + r.rstrip())
    print()

print('=== INSTANCES: shot field idx gx glyph ===')
for inst in instances:
    print('  %-4s %s[%d] gx=%-3d %s' % inst)
print()
print('=== READ: shot => fields ===')
for sname in ['ref','6c9','d30','dc9','ff5']:
    line = ['%-4s' % sname]
    for label, xs in fields.items():
        vals = []
        for idx, gx in enumerate(xs):
            n = None
            for (sn, l, i, g, name) in instances:
                if sn == sname and l == label and i == idx:
                    n = name
                    break
            vals.append(n if n else ' ')
        line.append('%s=[%s]' % (label, ' '.join(vals)))
    print(' | '.join(line))