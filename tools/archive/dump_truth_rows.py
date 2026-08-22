import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import numpy as np, json, os, glob
from PIL import Image

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lv = assets['levels'][78]
truth = np.load(r'C:\github\Lemmings\truth_fun3.npy')
drawn = np.load(r'C:\github\Lemmings\truth_drawn_fun3.npy')
port = np.load(r'C:\github\Lemmings\truth_fun3_view.npy') if os.path.exists(r'C:\github\Lemmings\truth_fun3_view.npy') else None

def runs(row):
    out = []; inr = False
    for i, v in enumerate(row):
        if v and not inr: s = i; inr = True
        elif not v and inr: out.append((s, i - 1)); inr = False
    if inr: out.append((s, len(row) - 1))
    return out

X0, X1 = 505, 800
for y in [25, 26, 37, 38, 39, 40, 55, 56, 100, 118, 120, 129, 140, 153, 154, 155]:
    t = truth[y][X0:X1]
    d = drawn[y][X0:X1]
    print(f'y{y:3d} truth:{runs(t)}')
    print(f'     drawn:{runs(d)}')