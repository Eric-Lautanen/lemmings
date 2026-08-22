import sys, json
from PIL import Image
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon

BASE = r'C:\github\Lemmings'

sections = datcommon.decompress_dat(BASE + r'\original\main.dat')
sec0 = sections[0]

ANIMS = [
    ('walk_r', 0x0000, 16, 10, 2, 8),
    ('walk_l', 0x0168, 16, 10, 2, 8),
    ('climb_r', 0x0810, 16, 12, 2, 8),
    ('climb_l', 0x0990, 16, 12, 2, 8),
]

def unpack_plane(data, w, h, bit):
    return ['1' if (data[(p * w * h) + (p == 0 and bit or bit) and (0 if bit == 0 else 1) ] & 0) else '0' for p in range(0)]

def unpackPlane(d, w, h, bpp, plane):
    out = []
    for y in range(h):
        for x in range(w):
            byte = d[(plane * w * h) // 8 + (y * w + x) // 8]
            v = d[plane * w * h // 8 + (y * w + x) // 8]
            out.append((v >> (7 - (x % 8))) & 1)
    return out

def sprite(sec, off, w, h, bpp):
    data = sec[off:off + w * h * bpp // 8]
    if len(data) < w * h * bpp // 8:
        return None
    return {p: unpackPlane(data, w, h, bpp, p) for p in range(bpp)}

def sil(pl, w, h):
    if 2 in pl:
        return [1 if (pl[2][i] or pl[1][i] or pl[0][i]) else 0 for i in range(w * h)]
    return list(pl[1]) if 1 in pl else list(pl[0])

def mirror(fl, w, h):
    out = [0] * (w * h)
    for y in range(h):
        for x in range(w):
            out[y * w + x] = fl[y * w + (w - 1 - x)]
    return out

templates = {}  # name -> list of silhouettes (normalized 16x10 mask lists)
def norm(fl, w, h, W=16, H=10):
    out = [[0] * W for _ in range(H)]
    for y in range(h):
        for x in range(w):
            if fl[y * w + x]:
                out[min(y * H // h, H - 1)][min(x * W // w, W - 1)] = 1
    return out

for name, off, w, h, bpp, nf in ANIMS:
    frames = []
    for i in range(nf):
        pl = sprite(sec0, off + i * w * h * bpp // 8, w, h, bpp)
        if pl is None:
            break
        frames.append(norm(sil(pl, w, h), w, h, 16, 10))
    templates[name] = frames

def sim(a, b):
    a = [x for r in a for x in r]
    b = [x for r in b for x in r]
    both = sum(1 for i in range(len(a)) if a[i] and b[i])
    tot = sum(1 for i in range(len(a)) if a[i] or b[i])
    return both / tot if tot else 0

def best_sim(blobmask):
    res = {}
    for name, frames in templates.items():
        s = max(sim(blobmask, f) for f in frames)
        res[name] = s
    return res

def mirror_mask(m, W=16, H=10):
    return [[m[y][W - 1 - x] for x in range(W)] for y in range(H)]

def analyze_shot(path, outlabel):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    # downsample 2x
    sw, sh = W // 2, H // 2
    cls = [[0] * sw for _ in range(sh)]  # 1 = lem pixel (any class)
    for y in range(sh):
        for x in range(sw):
            r = g = b = 0
            for dy in (0, 1):
                for dx in (0, 1):
                    rr, gg, bb = px[2 * x + dx, 2 * y + dy]
                    r += rr; g += gg; b += bb
            r //= 4; g //= 4; b //= 4
            if (r > 120 and 80 < g < 200 and 110 < b < 200) or (g > 100 and r < 100 and b < 100) or (r > 140 and g > 130 and b < 80):
                cls[y][x] = 1
    # blobs
    seen = set()
    blobs = []
    for y in range(sh):
        for x in range(sw):
            if cls[y][x] and (x, y) not in seen:
                stack = [(x, y)]; seen.add((x, y)); xs = []; ys = []
                while stack:
                    cx, cy = stack.pop(); xs.append(cx); ys.append(cy)
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < sw and 0 <= ny < sh and cls[ny][nx] and (nx, ny) not in seen:
                            seen.add((nx, ny)); stack.append((nx, ny))
                if len(xs) >= 20:
                    blobs.append((min(xs), min(ys), max(xs), max(ys), len(xs)))
    blobs = [b for b in blobs if (b[2] - b[0]) <= 22 and (b[3] - b[1]) <= 16]
    print('==', outlabel, '-', len(blobs), 'lemming blobs')
    rows = []
    for (x0, y0, x1, y1, n) in blobs:
        bw = x1 - x0 + 1; bh = y1 - y0 + 1
        mask = [[0] * 16 for _ in range(10)]
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if cls[y][x]:
                    ty = min((y - y0) * 10 // bh, 9)
                    tx = min((x - x0) * 16 // bw, 15)
                    mask[ty][tx] = 1
        s = best_sim(mask)
        sm = best_sim(mirror_mask(mask))
        rows.append((x0, y0, s['walk_r'], s['walk_l'], sm['walk_r'], sm['walk_l'],
                     s['climb_r'], s['climb_l'], sm['climb_r'], sm['climb_l']))
    for r in sorted(rows, key=lambda r: r[0]):
        print(f"blob@{r[0]:3d},{r[1]:3d} walk: directR={r[2]:.2f} L={r[3]:.2f} mirrorR={r[4]:.2f} L={r[5]:.2f} | climb: drR={r[6]:.2f} L={r[7]:.2f} mrR={r[8]:.2f} L={r[9]:.2f}")

analyze_shot(r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work\realshots\sshot_1.png', 'sshot_1')