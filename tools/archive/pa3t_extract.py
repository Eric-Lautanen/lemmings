from PIL import Image

def read_og(fn, gx, y0=160, h=15):
    im = Image.open(fn).convert('RGB')
    rows = []
    for yy in range(h):
        rows.append(''.join('#' if im.getpixel((gx + xx, y0 + yy)) != (0, 0, 0) else '.' for xx in range(7)))
    return rows

def read_2x(fn, gx, y0=328, h=22):
    im = Image.open(fn).convert('RGB')
    rows = []
    for yy in range(h):
        rows.append(''.join('#' if im.getpixel((2 * gx + xx, y0 + yy)) != (0, 0, 0) else '.' for xx in range(14)))
    return rows

OG_SLOTS = {
    'O': 113, 'U': 121, 'T': 129,
    '5(B1)': 145, 'B2blank': 153,
    'I': 186, 'N': 193,
    'D1blank': 209, '0': 217, '%': 225,
    'T2': 249, 'I2': 258, 'M': 265, 'E': 273,
    '2': 289, ':': 297, '9': 305, '5b': 313,
}

DOS_SLOTS = {
    'O(A1)': 113, 'U(A2)': 121, 'T(A3)': 129,
    'B1=%': 145, 'B2blank': 153,
    'I(C1)': 186, 'N(C2)': 193,
    '9(D1)': 209, '0(D2)': 217, '%(D3)': 225,
    'T(E1)': 249, 'I(E2)': 258, 'M(E3)': 265, 'E(E4)': 273,
    '2(F1)': 289, ':(F2)': 297, '9(F3)': 305, '5(F4)': 313,
}

DOS_DIGITS = {
    '8': ('6.png', 145), '2': ('7.png', 145), '9': ('7.png', 153),
    '6': ('8.png', 145), '5': ('9.png', 145), '0': ('9.png', 153),
    '1': ('10.png', 145), '1b': ('10.png', 153), '9b': ('11.png', 145),
    '1c': ('11.png', 153), '2b': ('13.png', 145), '0b': ('13.png', 153),
}

out = []
out.append('=== og_004 15-row font (native 1x, 7 wide, rows 160-174) ===')
for name, gx in OG_SLOTS.items():
    out.append(f'--- {name} gx={gx}')
    out.extend(read_og('og_004.png', gx))
out.append('')
out.append('=== 3.png 11-row font (2x, 14 wide, rows 328-349) ===')
for name, gx in DOS_SLOTS.items():
    out.append(f'--- {name} gx={gx}')
    out.extend(read_2x('3.png', gx))
out.append('')
out.append('=== extra DOS digits from other shots (2x, 14x22) ===')
for name, (fn, gx) in DOS_DIGITS.items():
    out.append(f'--- {name} from {fn} gx={gx}')
    out.extend(read_2x(fn, gx))

with open('pa4_glyphs.txt', 'w') as f:
    f.write('\n'.join(out))
print('wrote pa4_glyphs.txt')
