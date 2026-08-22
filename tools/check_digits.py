import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from datcommon import ORIG, decompress_dat, mask_to_bits

secs = decompress_dat(os.path.join(ORIG, 'main.dat'))
s2 = secs[2]

def glyph(i):
    return mask_to_bits(s2[0x1900 + i * 8:], 8, 8)

def show(name, bits, w=8):
    print(name)
    for y in range(8):
        print('   ' + ''.join('#' if bits[y * w + x] else '.' for x in range(w)))

# order [R0,L0,R1,L1,...] -> R_k = glyph[2k], L_k = glyph[2k+1]
def R(k):
    return glyph(2 * k)

def L(k):
    return glyph(2 * k + 1)

print('=== L5 (left half of 5) ===')
show('L5', L(5))
print('=== R5 ===')
show('R5', R(5))
print('=== L0 ===')
show('L0', L(0))
print('=== R0 ===')
show('R0', R(0))

# compose "50" per summary: frame cols 1-3 = L-half of tens (5), cols 5-7 = R-half of ones (0)
frame = [False] * 8 * 8
for y in range(8):
    for x in range(8):
        if 1 <= x <= 3 and L(5)[y * 8 + x]:
            frame[y * 8 + x] = True
        if 5 <= x <= 7 and R(0)[y * 8 + x]:
            frame[y * 8 + x] = True
show('combined 5+0 (cols1-3=L5, 5-7=R0)', frame)

# also try: two full glyphs side by side: "5" at cols 0-7, "0" at cols 8-15 (16 wide)
frame2 = [False] * 8 * 16
for y in range(8):
    for x in range(16):
        g = L(5) if x < 8 else R(0)
        if 1 <= x % 8 <= 3 and g[y * 8 + x % 8]:
            frame2[y * 16 + x] = True
        if 5 <= x % 8 <= 7 and g[y * 8 + x % 8]:
            frame2[y * 16 + x] = True
show('two frames: [L5 cols1-3 + ?], [?, R0 cols5-7]', frame2, 16)

# full 8x8 glyphs of 5 and 0: L+R merged (cols 1-3 = L, 5-7 = R)
def full(k):
    f = [False] * 8 * 8
    for y in range(8):
        for x in range(8):
            if 1 <= x <= 3 and L(k)[y * 8 + x]:
                f[y * 8 + x] = True
            if 5 <= x <= 7 and R(k)[y * 8 + x]:
                f[y * 8 + x] = True
    return f

show('full 5 = L5+R5', full(5))
show('full 0 = L0+R0', full(0))
