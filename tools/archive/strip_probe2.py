import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
from PIL import Image
import strip_probe_util

im = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\vgalemmi_004.png').convert('RGB')
for x0 in [183, 184, 185, 186, 187, 188, 255, 256, 257, 258, 259, 218, 219, 220, 221, 222, 223]:
    print(x0, strip_probe_util.match_at(im, x0))