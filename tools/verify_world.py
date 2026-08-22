"""Render the level world (terrain + objects) from the bundle and diff against ground-truth screenshot."""
import sys
import os
import json
import base64

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image

ORIG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'original')
SCREENS = r'C:\Users\ericl\AppData\Local\Temp\opencode\lemmings-work\screens'


def b64d(s):
    return base64.b64decode(s)


def unpack4(data, w, h):
    """4bpp packed (2px/byte, high nibble first) -> pixel rows."""
    px = []
    for y in range(h):
        for x in range(0, w, 2):
            b = data[y * ((w + 1) // 2) + (x >> 1)]
            px.append((b >> 4) & 0xF)
            if x + 1 < w:
                px.append(b & 0xF)
    return px


def unpack1(data, w, h):
    px = []
    rb = (w + 7) // 8
    for y in range(h):
        for x in range(w):
            px.append(1 if data[y * rb + (x >> 3)] & (1 << (7 - (x & 7))) else 0)
    return px


class World:
    def __init__(self):
        self.w = 1584
        self.h = 160
        self.buf = [0] * (self.w * self.h)  # low byte = palette idx, bit 24 = terrain

    def setp(self, x, y, color):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.buf[y * self.w + x] = color

    def draw_terrain(self, piece, x, y, mods):
        """piece = (w, h, pixels-list), mods flags: 8=no-overwrite, 4=flip, 2=erase."""
        w, h, px = piece
        flip = mods & 4
        for yy in range(h):
            sy = h - 1 - yy if flip else yy
            for xx in range(w):
                v = px[sy * w + xx]
                if not v:
                    continue
                tx, ty = x + xx, y + yy
                if not (0 <= tx < self.w and 0 <= ty < self.h):
                    continue
                i = ty * self.w + tx
                if mods & 2:
                    self.buf[i] = 0
                elif mods & 8:
                    if not (self.buf[i] & 0x1000000):
                        self.buf[i] = v | 0x1000000
                else:
                    self.buf[i] = v | 0x1000000

    def draw_object(self, px, mask, x, y, mode, w, h):
        """mode: 0=default overwrite, 1=no-overwrite (behind), 2=only-on-terrain."""
        for yy in range(h):
            for xx in range(w):
                if not mask[yy * w + xx]:
                    continue
                tx, ty = x + xx, y + yy
                if not (0 <= tx < self.w and 0 <= ty < self.h):
                    continue
                i = ty * self.w + tx
                if mode == 2:
                    if not (self.buf[i] & 0x1000000):
                        continue
                elif mode == 1:
                    if self.buf[i] & 0x1000000:
                        continue
                self.buf[i] = px[yy * w + xx] | 0x2000000


def main():
    with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'build', 'assets.js'), encoding='utf-8') as fh:
        A = json.loads(fh.read().split('=', 1)[1].rstrip(';'))

    lv = A['levels'][0]
    g = A['gfx'][lv['gfxset']]
    world = World()

    for t in lv['terrain']:
        x, mods, y, pid = t
        if g['terrains'][pid] is None:
            continue
        tw, th = g['terrains'][pid]['w'], g['terrains'][pid]['h']
        px = unpack4(b64d(g['terrains'][pid]['d']), tw, th)
        world.draw_terrain((tw, th, px), x, y, mods)

    for o in lv['objs']:
        x, y, oid, mods, disp = o
        meta = g['objects'][oid]
        if meta is None:
            continue
        w, h = meta['w'], meta['h']
        frame = meta['s']
        img = unpack4(b64d(meta['f'][frame][0]), w, h)
        mask = unpack1(b64d(meta['f'][frame][1]), w, h)
        mode = 2 if mods & 0x40 else (1 if mods & 0x80 else 0)
        if disp == 0x8F:
            img = [img[(h - 1 - yy) * w + xx] for yy in range(h) for xx in range(w)]
            mask = [mask[(h - 1 - yy) * w + xx] for yy in range(h) for xx in range(w)]
        world.draw_object(img, mask, x, y, mode, w, h)

    # camera: search offsets
    std7 = [(0,0,0),(16,16,56),(0,44,0),(60,52,52),(60,60,0),(60,8,8),(32,32,32),(56,32,8)]
    pal16 = [tuple((r*255//63, g*255//63, b*255//63)) for r, g, b in std7] + [tuple(c) for c in g['pc']]

    scr = Image.open(os.path.join(SCREENS, 'dos_letsgo.png')).convert('RGB')
    scr = scr.crop((0, 0, 320, 160))
    best = None
    for cam in range(300, 420, 4):
        match = 0
        for yy in range(0, 160, 2):
            for xx in range(0, 320, 2):
                v = world.buf[yy * world.w + xx + cam]
                col = pal16[v & 0xFF] if v else (0, 0, 0)
                s = scr.getpixel((xx, yy))
                if col == s:
                    match += 1
        print('cam', cam, 'match', match)
        if best is None or match > best[0]:
            best = (match, cam)
    print('best:', best)


if __name__ == '__main__':
    main()
