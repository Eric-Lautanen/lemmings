import os
import struct
import datcommon as dc

ORIG = dc.ORIG
BUILD = dc.BUILD

# Fixed lower entries of the VGA game palette (6-bit DAC values; rendered x4)
FIXED_LOW = [
    (0x00, 0x00, 0x00),   # 0 black
    (0x10, 0x10, 0x38),   # 1 blue (lemming bodies)
    (0x00, 0x2C, 0x00),   # 2 green (hair)
    (0x3C, 0x34, 0x34),   # 3 white (skin)
    (0x2C, 0x2C, 0x00),   # 4 dirty yellow (panel)
    (0x3C, 0x08, 0x08),   # 5 red (nuke)
    (0x20, 0x20, 0x20),   # 6 grey (panel)
]

# fixed low palette as 8-bit rgb (for PNG previews); DOS DAC scaling = value * 4
FIXED_LOW_RGB = [(r * 4, g * 4, b * 4) for r, g, b in FIXED_LOW]


def vga_entry(b3):
    r, g, b = b3
    return ((r & 0x3F) * 4, (g & 0x3F) * 4, (b & 0x3F) * 4)


def make_level_palette(custom):
    """16-entry RGB palette for in-level rendering (indices 0-15)."""
    pal = list(FIXED_LOW_RGB)
    pal.append(vga_entry(custom[0]))
    for e in custom:
        pal.append(vga_entry(e))
    return pal


def parse_groundxo(path):
    data = open(path, 'rb').read()
    objs = []
    for i in range(16):
        slot = data[i * 28:(i + 1) * 28]
        anim_flags, start_frame, end_frame, width, height = struct.unpack_from('<HBBBB', slot, 0)
        frame_data_size, mask_off = struct.unpack_from('<HH', slot, 6)
        u1, u2 = struct.unpack_from('<HH', slot, 10)
        trig_l, trig_t = struct.unpack_from('<HH', slot, 14)
        trig_w, trig_h = slot[18], slot[19]
        trig_effect = slot[20]
        frames_base, preview_idx = struct.unpack_from('<HH', slot, 21)
        u3 = struct.unpack_from('<H', slot, 25)[0]
        trap_sound = slot[27]
        objs.append(dict(anim_flags=anim_flags, start=start_frame, end=end_frame,
                         width=width, height=height, frame_size=frame_data_size,
                         mask_off=mask_off, trig_l=trig_l, trig_t=trig_t,
                         trig_w=trig_w, trig_h=trig_h, trig_effect=trig_effect,
                         base=frames_base, preview=preview_idx, sound=trap_sound))
    terrains = []
    off = 448
    for i in range(64):
        slot = data[off + i * 8:off + (i + 1) * 8]
        w, h = slot[0], slot[1]
        img_loc, mask_loc = struct.unpack_from('<HH', slot, 2)
        terrains.append(dict(width=w, height=h, image=img_loc, mask=mask_loc))
    pal_off = off + 512
    vga_custom = data[pal_off + 24:pal_off + 48]
    vga_preview = data[pal_off + 72:pal_off + 96]
    return dict(objects=objs, terrains=terrains,
                vga_custom=[tuple(vga_custom[i * 3:(i + 1) * 3]) for i in range(8)],
                vga_preview=[tuple(vga_preview[i * 3:(i + 1) * 3]) for i in range(8)])


def extract_graphics_set(grfile, groundfile):
    """Returns (groundxo_info, terrain list, object list).
    terrain: list of [idx] pixel lists (4-bit indices, 0=air).  objects: list of
    dicts with frames = list of (img_indices, mask_bools)."""
    gx = parse_groundxo(groundfile)
    sections = dc.decompress_dat(grfile)
    terrain_sec, obj_sec = sections[0], sections[1]

    terrain = []
    for t in gx['terrains']:
        w, h = t['width'], t['height']
        if w == 0 or h == 0:
            terrain.append(None)
            continue
        img = dc.unpack_planar(terrain_sec[t['image']:], 4, w, h)
        terrain.append(img)

    objs = []
    for o in gx['objects']:
        w, h = o['width'], o['height']
        if w == 0 or h == 0:
            objs.append(None)
            continue
        frames = []
        for f in range(o['end']):   # end = number of animation frames (empirically verified)
            start = o['base'] + f * o['frame_size']
            img = dc.unpack_planar(obj_sec[start:], 4, w, h)
            mask = dc.mask_to_bits(obj_sec[start + o['mask_off']:], w, h)
            frames.append((img, mask))
        objs.append(dict(meta=o, frames=frames))
    return gx, terrain, objs


def check_frame_counts(groundfile):
    """Determine whether 'end' means frame count or last index, by checking
    whether each object's data ends exactly where the next object's data begins."""
    gx = parse_groundxo(groundfile)
    bases = []
    for o in gx['objects']:
        if o['width'] and o['height']:
            bases.append(o['base'])
    for i, o in enumerate(gx['objects']):
        if not o['width'] or not o['height']:
            continue
        j = i + 1
        while j < 16 and not (gx['objects'][j]['width'] and gx['objects'][j]['height']):
            j += 1
        if j >= 16:
            break
        nxt = gx['objects'][j]['base']
        end_as_last = o['base'] + (o['end'] + 1) * o['frame_size'] == nxt
        end_as_count = o['base'] + o['end'] * o['frame_size'] == nxt
        print(f'  obj {i}: end={o["end"]} fs={o["frame_size"]} base={o["base"]} next={nxt} '
              f'end+1frames={"YES" if end_as_last else "no"} endframes={"YES" if end_as_count else "no"}')
    return
