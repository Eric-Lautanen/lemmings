import sys
sys.path.insert(0, r'C:\github\Lemmings\tools')
import datcommon as dc
from PIL import Image

main = open(r'C:\github\Lemmings\original\main.dat', 'rb').read()
pos = 0
secs = []
while pos < len(main):
    comp_size = int.from_bytes(main[pos + 6:pos + 10], 'big')
    secs.append(dc.decompress_section(main[pos:pos + comp_size]))
    pos += comp_size
s6 = secs[6]
panel = dc.unpack_planar(s6[0:], 4, 320, 40)

# panel palette mapping (value -> RGB) from extract_graphics
PAL = {
    0: (0, 0, 0),
    1: (0, 0, 0),
    2: (0, 176, 0),
    3: (240, 208, 208),
    4: (176, 176, 0),
    5: (176, 176, 0),
    6: (176, 176, 0),
    7: (0, 0, 0),
}

def panel_button(k):
    bx = 1 + k * 16
    out = []
    for yy in range(16, 39):
        row = []
        for x in range(bx, bx + 16):
            v = panel[yy * 320 + x]
            c = PAL.get(v, (0, 0, 0))
            row.append(c)
        out.append(row)
    return out

# capture: button region = same coords
def capture_button(img, k):
    bx = 1 + k * 16
    px = img.load()
    out = []
    for yy in range(16, 39):
        row = []
        for x in range(bx, bx + 16):
            row.append(px[x, 160 + yy])
        out.append(row)
    return out

names = ['Slower', 'Faster', 'Climber', 'Umbrella', 'Explode', 'Blocker',
         'Builder', 'Basher', 'Miner', 'Digger', 'Pause', 'Nuke']

for name in ['vgalemmi_002', 'vgalemmi_004']:
    img = Image.open(r'C:\Users\ericl\AppData\Local\Temp\opencode\og\{}.png'.format(name)).convert('RGB')
    print('==== {} ===='.format(name))
    for k in range(12):
        cap = capture_button(img, k)
        pan = panel_button(k)
        # score: fraction of pixels where capture matches panel's value color (white or green or yellow)
        match = 0
        tot = 0
        for yy in range(22):
            for xx in range(16):
                p = cap[yy][xx]
                v = panel[yy * 320 + 1 + k * 16 + xx]
                tot += 1
                # compare to the panel's intended color
                pc = PAL.get(v, (0, 0, 0))
                if (p[0], p[1], p[2]) == pc:
                    match += 1
        print('  {} x{}: {:.0%} pixels match panel base art'.format(names[k], 1 + k * 16, match / tot))