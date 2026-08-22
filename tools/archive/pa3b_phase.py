from PIL import Image
import glob, sys

SLOTS = [113,121,129,145,153,186,193,209,217,225,249,258,265,273,289,297,305,313]
BAND = (328, 350)  # y range

def load(fn):
    im = Image.open(fn).convert('RGB')
    return im

def read_slot(im, gx, y0, dx0, dy0):
    w, h = im.size
    out = []
    for yy in range(y0, y0+11):
        row = []
        for xx in range(6):
            px = 2*gx + dx0 + xx
            py = 2*yy + dy0
            if px < w and py < h:
                row.append(im.getpixel((px, py)))
            else:
                row.append(None)
        out.append(row)
    return out

def noise_score(im, dx0, dy0):
    # gap columns left of slot 0 (x=-1 in slot space) and between slots: columns gx+6..gx+7? 
    # slots are at least 8 apart (e.g. 113..121) -> gap cols at gx+6, gx+7 are always background
    score = 0
    total = 0
    for gx in SLOTS:
        for gx2 in (gx+6, gx+7):
            for yy in range(BAND[0], BAND[1]):
                px = 2*gx2 + dx0
                py = 2*yy + dy0
                if px < im.size[0] and py < im.size[1]:
                    px2 = px + 0  # window col 6..7 in slot coords -> x = 2*gx+dx0+6..7
                    pass
    # simpler: count non-background in the 2 columns between adjacent slots
    nb = 0
    tot = 0
    for a, b in zip(SLOTS, SLOTS[1:]):
        if b - a < 9: continue
        for gx2 in (a+6, a+7):
            for yy in range(BAND[0], BAND[1]):
                px = 2*gx2 + dx0
                py = 2*yy + dy0
                if px < im.size[0] and py < im.size[1]:
                    tot += 1
                    c = im.getpixel((px, py))
                    # background = most common color in the whole band row
    # background estimation: take the gap columns sample
    samples = []
    for a, b in zip(SLOTS, SLOTS[1:]):
        if b - a < 9: continue
        for gx2 in (a+6, a+7):
            for yy in range(BAND[0], BAND[1]):
                px = 2*gx2 + dx0
                py = 2*yy + dy0
                if px < im.size[0] and py < im.size[1]:
                    samples.append(im.getpixel((px, py)))
    from collections import Counter
    bg = Counter(samples).most_common(1)[0][0]
    off = sum(1 for s in samples if s != bg)
    return off / max(1, len(samples)), bg

def slot_to_art(im, gx, y0, dx0, dy0):
    rows = read_slot(im, gx, y0, dx0, dy0)
    bg = None
    return rows

def main(fn):
    im = load(fn)
    # find best phase among 4 combos; need dy0 too: band may be at 2*164+dy0
    results = []
    for dy0 in (0, 1):
        for dx0 in (0, 1):
            # ensure band rows exist
            if 2*(BAND[1]-1) + dy0 >= im.size[1]:
                continue
            score, bg = noise_score(im, dx0, dy0)
            results.append((score, dx0, dy0, bg))
    results.sort()
    score, dx0, dy0, bg = results[0]
    print(f'== {fn}: best phase dx0={dx0} dy0={dy0} bg={bg} score={score:.3f}')
    for i, gx in enumerate(SLOTS):
        rows = read_slot(im, gx, BAND[0], dx0, dy0)
        print(f'  slot {i} gx={gx}:')
        for row in rows:
            print('    ' + ''.join('#' if c is not None and c != bg else '.' for c in row))
    print()

if __name__ == '__main__':
    for fn in sys.argv[1:]:
        main(fn)
