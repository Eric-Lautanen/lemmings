import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from PIL import Image

SCREENS = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp',
                       'opencode', 'lemmings-work', 'screens')
GOLD = (141, 141, 0)


def main():
    img = Image.open(os.path.join(SCREENS, 'dos_letsgo.png')).convert('RGB')
    p = img.load()
    print('=== rows 160..199, non-black pixel column bands ===')
    for y in range(160, 200):
        cols = []
        x = 0
        while x < 320:
            if p[x, y] != (0, 0, 0):
                x0 = x
                while x < 320 and p[x, y] != (0, 0, 0):
                    x += 1
                cols.append('%d-%d' % (x0, x - 1))
            else:
                x += 1
        print('y=%3d: %s' % (y, ', '.join(cols) if cols else '-'))

    print()
    print('=== colors per row (most common) ===')
    from collections import Counter
    for y in range(160, 200):
        c = Counter(p[x, y] for x in range(320))
        top = c.most_common(4)
        print('y=%3d: %s' % (y, ['%s x%d' % (str(t[0]), t[1]) for t in top]))


if __name__ == '__main__':
    main()
