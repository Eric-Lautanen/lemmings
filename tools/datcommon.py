import struct
import os

ORIG = os.path.join(os.path.dirname(__file__), '..', 'original')
BUILD = os.path.join(os.path.dirname(__file__), '..', 'build')


def decompress_section(data):
    """Decompress one .DAT section (10-byte header + compressed data)."""
    num_bits = data[0]
    checksum = data[1]
    out_size = int.from_bytes(data[2:6], 'big')
    comp_size = int.from_bytes(data[6:10], 'big')  # includes the 10-byte header
    comp = data[10:comp_size]

    # bit reader: starts at last byte of comp, pulls num_bits bits,
    # then moves backwards one byte at a time, 8 bits each.
    ci = len(comp) - 1
    curbits = comp[ci]
    bitcnt = num_bits + 1

    def getnextbits(n):
        nonlocal ci, curbits, bitcnt
        result = 0
        while True:
            bitcnt -= 1
            if bitcnt == 0:
                ci -= 1
                if ci < 0:
                    raise ValueError('ran out of bits')
                curbits = comp[ci]
                bitcnt = 8
            result <<= 1
            result |= (curbits & 1)
            curbits >>= 1
            n -= 1
            if n <= 0:
                break
        return result

    out = bytearray(out_size)
    di = out_size

    while di > 0:
        if getnextbits(1) == 1:
            t = getnextbits(2)
            if t == 0:
                length, w = 3, 9
            elif t == 1:
                length, w = 4, 10
            elif t == 2:
                length = getnextbits(8) + 1
                w = 12
            else:
                length = getnextbits(8) + 9
                # raw data
                while length > 0:
                    di -= 1
                    out[di] = getnextbits(8)
                    length -= 1
                continue
            offset = getnextbits(w) + 1
            if not (di - 1 + offset < out_size and di - length >= 0):
                raise ValueError('bad reference')
            while length > 0:
                di -= 1
                out[di] = out[di + offset]
                length -= 1
        else:
            if getnextbits(1) == 0:
                length = getnextbits(3) + 1
                if di - length < 0:
                    raise ValueError('bad raw')
                while length > 0:
                    di -= 1
                    out[di] = getnextbits(8)
                    length -= 1
            else:
                offset = getnextbits(8) + 1
                length = 2
                if not (di - 1 + offset < out_size and di - length >= 0):
                    raise ValueError('bad reference2')
                while length > 0:
                    di -= 1
                    out[di] = out[di + offset]
                    length -= 1

    return bytes(out)


def decompress_dat(path):
    """Decompress a whole .dat file into a list of sections."""
    data = open(path, 'rb').read()
    sections = []
    pos = 0
    while pos < len(data):
        comp_size = int.from_bytes(data[pos + 6:pos + 10], 'big')
        sections.append(decompress_section(data[pos:pos + comp_size]))
        pos += comp_size
    return sections


def unpack_planar(data, planes, w, h):
    """Unpack a 'planes'-bpp planar bitmap into per-pixel values 0..(1<<planes)-1.
    Each plane is a monochrome bitmap, bits row-major, MSB-first within a byte,
    rows padded to byte boundaries. Plane p contributes (1<<p)."""
    px = [0] * (w * h)
    rowbytes = (w + 7) // 8
    for p in range(planes):
        plane = data[p * rowbytes * h:(p + 1) * rowbytes * h]
        for y in range(h):
            row = plane[y * rowbytes:(y + 1) * rowbytes]
            for x in range(w):
                if row[x >> 3] & (1 << (7 - (x & 7))):
                    px[y * w + x] |= 1 << p
    return px


def mask_to_bits(data, w, h):
    """Unpack a monochrome mask bitmap into a list of bools."""
    px = [0] * (w * h)
    rowbytes = (w + 7) // 8
    for y in range(h):
        row = data[y * rowbytes:(y + 1) * rowbytes]
        for x in range(w):
            if row[x >> 3] & (1 << (7 - (x & 7))):
                px[y * w + x] = 1
    return px
