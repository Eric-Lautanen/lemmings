from PIL import Image
img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\fun3_dos.png').convert('RGBA')
X0 = 489
px = img.load()

def is_terr(c):
    r, g, b, a = c
    if (r, g, b) == (0, 0, 51): return False
    if (r, g, b) == (0, 0, 0): return False
    if max(r, g, b) < 25: return False
    return True

def line(xa, xb, rows):
    for y in rows:
        s = ''.join('1' if is_terr(px[x - X0, y]) else '0' for x in range(xa, xb + 1))
        print(f'y{y:3d} [{xa}..{xb}]: {s}')

print('G1 belt rows 36..43, cols 620..810:')
line(620, 810, range(36, 44))
print()
print('pillar top rows 0..9, cols 818..862:')
line(818, 862, range(0, 10))
print()
print('pillar mid rows 40..49, cols 818..862:')
line(818, 862, range(40, 50))