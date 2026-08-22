import numpy as np, json, base64
from PIL import Image
from collections import Counter

cap = np.array(Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_002.png').convert('RGB'))
field = cap[:160]
cnt = Counter(map(tuple, field.reshape(-1, 3)))
print('unique colors in field:', len(cnt))
for c, n in cnt.most_common(30):
    print(c, n)

assets = json.load(open(r'C:\github\Lemmings\build\assets.json'))
lv = assets['levels'][73]
g = assets['gfx'][lv['gfxset']]
print('\ngfxset', lv['gfxset'], 'pc(8bit as bundled):', g['pc'])
print('pp:', g['pp'])
