import os, glob
from collections import defaultdict

try:
    from PIL import Image
except ImportError:
    print('NO PIL')
    raise SystemExit

d = r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work\realshots'
for f in sorted(glob.glob(os.path.join(d, 'sshot_*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    px = im.load()
    # lemmings: blue bodies (b high, r low) or green hair (g high, b low, r low)
    clusters = []
    seen = set()
    for y in range(0, h):
        for x in range(0, w):
            r, g, b = px[x, y]
            islem = (b > 120 and r < 100 and g < 150) or (g > 120 and r < 100 and b < 100)
            if not islem:
                continue
            if (x, y) in seen:
                continue
            # flood fill
            stack = [(x, y)]
            seen.add((x, y))
            xs = [x]; ys = [y]
            n = 0
            while stack and n < 4000:
                cx, cy = stack.pop()
                n += 1
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                            r2, g2, b2 = px[nx, ny]
                            if (b2 > 90 and r2 < 120) or (g2 > 90 and r2 < 120 and b2 < 130):
                                seen.add((nx, ny))
                                xs.append(nx); ys.append(ny)
                                stack.append((nx, ny))
            if n >= 30:
                clusters.append((min(xs), min(ys), max(xs), max(ys), n))
    print(os.path.basename(f), w, 'x', h, '->', len(clusters), 'lem clusters')
    for c in sorted(clusters):
        print('   ', c)