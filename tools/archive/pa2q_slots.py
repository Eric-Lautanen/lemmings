import os
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'
SLOTS = [('A1',113),('A2',121),('A3',129),('B1',145),('B2',153),
         ('C1',186),('C2',193),('D1',209),('D2',217),('D3',225),
         ('E1',249),('E2',258),('E3',265),('E4',273),
         ('F1',289),('F2',297),('F3',305),('F4',313)]

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def glyph(px, gx, off):
    g = []
    for gy in range(11):
        y = 328 + 2 * gy
        line = ''
        for w in range(6):
            x = 2 * (gx + w) + off
            on = False
            for dx in range(2):
                for dy in range(2):
                    if is_green(px, x + dx, y + dy):
                        on = True
            line += '#' if on else '.'
        g.append(line)
    return g

def main():
    import sys
    shots = ['018', '042', '046', '8dc', '99b', 'ff5', '229', '2f1', '330', '6d6', 'e91', 'ref']
    names = sys.argv[1:] if len(sys.argv) > 1 else shots
    for name in names:
        off = 1 if name == 'ref' else 0
        path = os.path.join(D, 'pa_%s.png' % name) if name != 'ref' else r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'
        im = Image.open(path).convert('RGB')
        px = im.load()
        print('==', name)
        # header
        print('   ' + ' '.join('%-7s' % s for s, _ in SLOTS))
        for gy in range(11):
            line = []
            for s, gx in SLOTS:
                line.append(glyph(px, gx, off)[gy] + ' ')
            print('%.2d' % gy, ''.join(line).rstrip())
        print()

main()