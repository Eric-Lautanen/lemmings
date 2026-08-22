import os, re
from PIL import Image

D = r'C:\Users\ericl\AppData\Local\Temp\opencode'
REF = r'C:\github\Lemmings\build\ref\sshot3_dosdays_fun1.png'

def is_green(px, x, y):
    r, g, b = px[x, y]
    return g > 130 and g > r + 40 and g > b + 40

def main():
    shots = [('ref', REF, 1), ('018', os.path.join(D, 'pa_018.png'), 0),
             ('042', os.path.join(D, 'pa_042.png'), 0), ('6c9', os.path.join(D, 'pa_6c9.png'), 0),
             ('d30', os.path.join(D, 'pa_d30.png'), 0), ('e91', os.path.join(D, 'pa_e91.png'), 0)]
    out = []
    ruler = '    ' + ''.join('%s%d' % (' ' * 9, gx // 10) for gx in range(100, 320, 10))
    ruler2 = '    ' + ''.join('%d' % (gx % 10) for gx in range(100, 320))
    for name, path, off in shots:
        im = Image.open(path).convert('RGB')
        px = im.load()
        out.append('=' * 60)
        out.append('==== %s (gx 100..319)' % name)
        out.append(ruler)
        out.append(ruler2)
        for gy in range(164, 175):
            y = 328 + (gy - 164) * 2
            line = ''
            for gx in range(100, 320):
                x = 2 * gx + off
                on = (is_green(px, x, y) or is_green(px, x + 1, y) or
                      is_green(px, x, y + 1) or is_green(px, x + 1, y + 1))
                line += '#' if on else '.'
            # compress runs: split into chars, but keep full width for reading
            out.append('%3d  %s' % (gy, line))
    with open('pa2d_stripart.txt', 'w') as f:
        f.write('\n'.join(out))
    print('done')

main()