"""adlib_player.py - Python reimplementation of the Lemmings AdLib music driver
(Sound Images 1991). Reproduces the exact OPL register-write stream, verified
frame-by-frame against emu8086.py (see verify_player.py), plus an optional
OPL2-style FM renderer for WAV output.

Driver anatomy (all offsets relative to decompressed ADLIB.DAT image):
  API: AH=0 update(0x0115) AH=1 detect(0x00A3) AH=2 init(0x003A)
       AH=3 set_tune(->[0x0ED]) AH=4 set_tempo(->[0x0F0]) AH=5 start(0x04FE)
  globals: 0x0B68 voice-base, 0x0B6A tempo, 0x0B6B tempo-countdown,
           0x0B6C channel-count, 0x0B6E tune-data base, 0x08A3 OPL base port
  channel struct: 9 x 0x14 bytes at 0x05AC:
      +0 note, +1 dur-counter, +2 voice-ptr, +4 voice-idx, +5 dl, +6 dh,
      +7 ch, +8 keyoff-word, +10 section-ptr, +12 stream-ptr, +14 volume,
      +15 car-vol, +16 flag(0 off/1 on/2 always-tick), +17 duration,
      +18 offset, +19 slide
  commands: 0x00-0x7F note, 0x80 loop, 0x81 keyoff, 0x82 rest, 0x83 silence,
            0x84 set-offset, 0x85 channel-off, 0x86/0x87 slide +/-,
            0xB0-0xBF volume 2-byte, 0xC0-0xDF note+voice, 0xE0-0xEF duration
   freq: idx=(note+offset+4)&0xFF; oct=tab[0x0AA7+idx]; semi=tab[0x0B07+idx]
         w=word[0x0927+((semi*32)&0x1FF)]; bl=oct-1; if w>=0x8000: bl+=1
        if bl<0: bl=0; w>>=1 ; A0+ch=w&0xFF; B0+ch=0x20|((w>>8)&3)|(bl<<2)
  volume: tab[0x08A7+..] = 0x3F - i//2 (0x7F = loudest)
"""
import sys, os, struct, math, wave, argparse

DRIVER_PORT = 0x0388          # [0x08A3]
TUNE_DATA = 0x0B6E
CH0 = 0x05AC
VOICE_TABLE_CH4 = 0x54E3      # voices for channels 4-8
TEMPO_TABLE = 0x55E3          # tempo-override stream pointers


def decompress_section(data):
    """Decompress one .DAT section (10-byte header + compressed data)."""
    num_bits = data[0]
    checksum = data[1]
    out_size = int.from_bytes(data[2:6], 'big')
    comp_size = int.from_bytes(data[6:10], 'big')
    comp = data[10:comp_size]
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


class Driver:
    """Faithful reimplementation of the driver's behavior (register stream)."""

    def __init__(self, image, log=True):
        self.m = bytearray(image)
        self.events = []            # (reg, val)
        self.log = log
        self.opl = {}               # OPL register state (for render)
        # NOTE: the image already carries the true per-channel operator
        # offsets at ch+5 (mod) and ch+6 (car); never overwrite them.

    # -- memory helpers ----------------------------------------------------
    def b(self, a):
        return self.m[a]

    def w(self, a):
        return self.m[a] | (self.m[a + 1] << 8)

    def sw(self, a, word):
        self.m[a] = word & 0xFF
        self.m[a + 1] = (word >> 8) & 0xFF

    # -- OPL output --------------------------------------------------------
    def out(self, reg, val):
        reg &= 0xFF
        val &= 0xFF
        if self.log:
            self.events.append((reg, val))
        self.opl[reg] = val

    def out_word(self, word):
        self.out(word & 0xFF, (word >> 8) & 0xFF)   # reg = low byte

    # -- init table (27 words at 0x006D) ------------------------------------
    def init(self):
        self.silence_all()
        for i in range(27):
            self.out(self.b(0x006D + i * 2), self.b(0x006D + i * 2 + 1))
        for k in range(9):
            self.m[CH0 + k * 0x14 + 16] = 0

    def silence_all(self):
        di = CH0
        n = self.w(0x0B6C)
        for _ in range(n):
            self.out_word(self.w(di + 8))
            self.m[di + 16] = 0
            di += 0x14
        self.m[0x0ED] = 0

    # -- API ---------------------------------------------------------------
    def set_tune(self, tune):
        self.m[0x0ED] = tune

    def set_tempo(self, tempo):
        self.m[0x0F0] = tempo

    def start(self):
        # AH=5: pure kick-clear -> m[0x0EE] = 0; the tune-start prelude
        # (9 keyoffs + four control writes) is emitted by load_tune.
        self.m[0x0EE] = 0

    def detect(self):
        dx = DRIVER_PORT
        self.out(0x04, 0x60)
        self.out(0x04, 0x80)
        st1 = 0x80                    # emulator in_cb returns (ax>>8)&0xFF
        self.out(0x02, 0xFF)
        st2 = 0xFF
        self.out(0x04, 0x60)
        self.out(0x04, 0x80)
        al, bl = st1 & 0xE0, st2 & 0xE0
        if (bl & al) == 0 and al == 0xC0:
            return 1
        return 0

    # -- update -------------------------------------------------------------
    def update(self):
        self.tune_check()
        self.tempo_override()
        self.m[0x0B6B] = (self.m[0x0B6B] - 1) & 0xFF
        for k in range(9):
            self.tick(CH0 + k * 0x14)
        if self.m[0x0B6B] == 0:
            self.m[0x0B6B] = self.m[0x0B6A]

    # -- tune change check (0x0457) -----------------------------------------
    def tune_check(self):
        if self.m[0x0EE] == 0:
            self.m[0x0EF] = self.m[0x0ED]
        if self.m[0x0EF] == 0:
            return
        tune = self.m[0x0EF]
        self.m[0x0ED] = 0
        self.m[0x0EF] = 0
        if tune >= 0x16:
            self.silence_all()
            return
        self.load_tune(tune)

    def load_tune(self, tune):
        self.m[0x0EE] = tune
        si = 0x0B6C + tune * 2
        si = self.w(si)                          # tune header pointer
        self.m[0x05A8] = self.b(si); self.m[0x05A9] = self.b(si + 1)
        si += 2
        self.sw(0x0B68, self.w(si) + TUNE_DATA)
        si += 2
        self.m[0x0B6A] = self.b(si)
        si += 1
        chcount = self.b(si)
        si += 1
        self.m[0x0B6C] = chcount
        di = CH0
        for _ in range(chcount):
            bx = (self.w(si) + TUNE_DATA) & 0xFFFF
            si += 2
            stream = (self.w(bx) + TUNE_DATA) & 0xFFFF
            bx += 2
            self.m[di + 10] = bx & 0xFF
            self.m[di + 11] = (bx >> 8) & 0xFF
            self.m[di + 12] = stream & 0xFF
            self.m[di + 13] = (stream >> 8) & 0xFF
            self.m[di + 1] = 1
            self.m[di + 16] = 1
            di += 0x14
        for k in range(9):
            self.out_word(self.w(CH0 + k * 0x14 + 8))
        self.out(0x01, 0x20)
        self.out(0xBD, 0xC0)
        self.out(0x08, 0x00)
        self.out(0x04, 0x21)
        self.m[0x0B6B] = 1

    # -- tempo override / metronome (0x051C) --------------------------------
    def tempo_override(self):
        bl = self.m[0x0F0]
        if bl == 0 or bl >= 0x13:
            return
        di = 0x064C
        found = None
        for _ in range(4):
            if self.m[di + 16] == 0:
                found = di
                break
            di -= 0x14
        if found is None:
            return
        self.m[0x0F0] = 0
        self.m[found + 16] = 2
        bx = self.w(TEMPO_TABLE + bl * 2)
        self.m[found + 19] = 0
        self.fetch(found, bx)

    # -- per-channel tick (0x0177) ------------------------------------------
    def tick(self, di):
        if self.m[di + 16] == 0:
            return
        bx = self.w(di + 12)
        if self.m[di + 16] != 2 and self.m[0x0B6B] != 0:
            return
        self.m[di + 1] = (self.m[di + 1] - 1) & 0xFF
        if self.m[di + 1] == 0:
            self.fetch(di, bx)
        else:
            if self.m[di + 19] != 0:
                self.slide(di)
                self.freq(di)
            self.note_end_check(di, bx)

    def slide(self, di):
        al = self.m[di + 19]
        if al == 0:
            return
        self.m[di] = (self.m[di] + al) & 0xFF

    def note_end_check(self, di, bx):
        if self.b(bx) == 0x82:
            return
        si = self.w(di + 2)
        if self.b(si + 14) != self.m[di + 1]:
            return
        self.out_word(self.w(di + 8))
        self.m[di + 19] = 0

    # -- stream fetch (0x019E) ----------------------------------------------
    def fetch(self, di, bx):
        al = self.b(bx)
        bx = (bx + 1) & 0xFFFF
        if al & 0x80:
            if al >= 0xE0:                       # duration
                self.m[di + 17] = al - 0xDF
                self.fetch(di, bx)
            elif al >= 0xC0:                     # note + voice
                self.note_voice(di, bx, al)
            elif al >= 0xB0:                     # volume
                self.volume_cmd(di, bx, al)
            else:
                self.cmd(di, bx, al)
        else:                                    # note
            self.m[di] = al
            self.out_word(self.w(di + 8))        # key off
            self.freq(di)
            self.m[di + 12] = bx & 0xFF
            self.m[di + 13] = (bx >> 8) & 0xFF
            self.m[di + 1] = self.m[di + 17]

    # -- volume command 0xB0-0xBF -------------------------------------------
    def volume_cmd(self, di, bx, al):
        vol = self.b(bx)
        bx = (bx + 1) & 0xFFFF
        self.m[di + 14] = vol
        si = self.w(di + 2)
        dl, dh = self.m[di + 5], self.m[di + 6]
        ah = self.b(0x08A7 + (vol & 0x7F))
        al2 = (self.b(si + 12) << 2) & 0xC0
        self.out(0x40 + dl, ah | al2)
        bl = (self.m[di + 15] + self.b(si + 10)) & 0x7F
        ah = self.b(0x08A7 + bl)
        al2 = (self.b(si + 12) << 2) & 0xC0
        al2 = ((al2 >> 2) | (al2 << 6)) & 0xFF     # ror al, 2
        self.out(0x40 + dh, ah | al2)
        self.fetch(di, bx)

    # -- note + voice command 0xC0-0xDF --------------------------------------
    def note_voice(self, di, bx, al):
        al -= 0xC0
        self.m[di + 4] = al
        idx = ((al - 1) & 0xFF) * 16
        if di < 0x05FC:
            base = self.w(0x0B68)
        else:
            base = VOICE_TABLE_CH4
        si = (base + idx) & 0xFFFF
        self.m[di + 2] = si & 0xFF
        self.m[di + 3] = (si >> 8) & 0xFF
        dl, dh = self.m[di + 5], self.m[di + 6]
        self.out(0x60 + dl, self.b(si + 0))
        self.out(0x60 + dh, self.b(si + 1))
        self.out(0x80 + dl, self.b(si + 2))
        self.out(0x80 + dh, self.b(si + 3))
        self.out(0xE0 + dl, self.b(si + 6))
        self.out(0xE0 + dh, self.b(si + 7))
        self.out(0xC0 + self.m[di + 7], self.b(si + 9))
        self.out(0x20 + dl, self.b(si + 4))
        self.out(0x20 + dh, self.b(si + 5))
        self.m[di + 18] = self.b(si + 8)
        self.m[di + 14] = self.b(si + 10)
        ah = self.b(0x08A7 + (self.b(si + 10) & 0x7F))
        al2 = (self.b(si + 12) << 2) & 0xC0
        self.out(0x40 + dl, ah | al2)
        self.m[di + 15] = self.b(si + 11)
        bl = (self.b(si + 11) + self.b(si + 10)) & 0x7F
        ah = self.b(0x08A7 + bl)
        al2 = ((self.b(si + 12) << 2) & 0xC0)
        al2 = ((al2 >> 2) | (al2 << 6)) & 0xFF     # ror al, 2
        self.out(0x40 + dh, ah | al2)
        self.m[di + 18] = self.b(si + 8)
        self.fetch(di, bx)

    # -- 0x80-0xAF commands --------------------------------------------------
    def cmd(self, di, bx, al):
        J = [0x0415, 0x01C0, 0x01B3, 0x03AA, 0x0430, 0x043A, 0x0447, 0x044F]
        target = J[al - 0x80] if al - 0x80 < 8 else None
        if target is None:
            raise ValueError('unknown command %02X' % al)
        if target == 0x0415:                      # loop
            self.loop_cmd(di)
        elif target == 0x01C0:                    # key off / note end
            self.out_word(self.w(di + 8))
            self.m[di + 19] = 0
            self.rest_cmd(di, bx)
        elif target == 0x01B3:                    # rest
            self.rest_cmd(di, bx)
        elif target == 0x03AA:                    # silence all
            self.silence_all()
            self.m[0x0ED] = 0
        elif target == 0x0430:                    # set offset
            self.m[di + 18] = self.b(bx)
            self.fetch(di, (bx + 1) & 0xFFFF)
        elif target == 0x043A:                    # channel off
            self.out_word(self.w(di + 8))
            self.m[di + 16] = 0
        elif target == 0x0447:                    # slide up
            self.m[di + 19] = 1
            self.fetch(di, bx)
        elif target == 0x044F:                    # slide down
            self.m[di + 19] = 0xFF
            self.fetch(di, bx)

    def rest_cmd(self, di, bx):
        self.m[di + 12] = bx & 0xFF
        self.m[di + 13] = (bx >> 8) & 0xFF
        self.m[di + 1] = self.m[di + 17]

    def loop_cmd(self, di):
        bx = self.w(di + 10)
        cx = self.w(bx)
        bx = (bx + 2) & 0xFFFF
        if cx == 0:
            self.section_follow(di)
        else:
            self.m[di + 10] = bx & 0xFF
            self.m[di + 11] = (bx >> 8) & 0xFF
            self.m[di + 12] = (cx + TUNE_DATA) & 0xFF
            self.m[di + 13] = ((cx + TUNE_DATA) >> 8) & 0xFF
            self.fetch(di, (cx + TUNE_DATA) & 0xFFFF)

    def section_follow(self, di):
        bx = (self.w(di + 10) + TUNE_DATA) & 0xFFFF
        cx = self.w(bx)
        bx = (bx + 2) & 0xFFFF
        self.m[di + 10] = bx & 0xFF
        self.m[di + 11] = (bx >> 8) & 0xFF
        stream = (cx + TUNE_DATA) & 0xFFFF
        self.m[di + 12] = stream & 0xFF
        self.m[di + 13] = (stream >> 8) & 0xFF
        self.fetch(di, stream)

    # -- freq calculation (0x0349) -------------------------------------------
    def freq(self, di):
        idx = (self.m[di] + self.m[di + 18] + 4) & 0xFF
        bl = self.b(0x0AA7 + idx)
        semi = (self.b(0x0B07 + idx) * 32) & 0x1FF
        word = self.w(0x0927 + semi)
        bl -= 1
        if word >= 0x8000:
            bl += 1
        if bl < 0:
            bl += 1
            word >>= 1
        ch = self.m[di + 7]
        self.out(0xA0 + ch, word & 0xFF)
        ah = ((word >> 8) & 3) | ((bl << 2) & 0xFF)
        self.m[di + 8] = (0xB0 + ch) & 0xFF
        self.m[di + 9] = ah
        self.out(0xB0 + ch, ah | 0x20)

    # -- helpers -------------------------------------------------------------
    def struct_dump(self):
        out = []
        for k in range(9):
            base = CH0 + k * 0x14
            out.append('%02X' % k + ': ' +
                       ' '.join('%02X' % self.m[base + i] for i in range(20)))
        return '\n'.join(out)


# ======================================================================
# OPL2-style renderer
# ======================================================================

SLOT_MOD = [0, 1, 2, 3, 4, 5, 8, 9, 10]
SR = 44100
OPL_CLOCK = 3579545.0
EG_TICK = OPL_CLOCK / 72.0 / 48.0        # ~1035 Hz EG updates


def opl_hz(fnum, block):
    return (fnum << block) * OPL_CLOCK / (72.0 * (1 << 20))


def wave(phase, wf):
    s = math.sin(phase)
    if wf == 0:
        return s
    if wf == 1:                        # half sine
        return s if s > 0 else 0.0
    if wf == 2:                        # abs sine
        return abs(s)
    return max(0.0, s) if s >= 0 else -max(0.0, -s)   # quarter-ish


class Op:
    def __init__(self):
        self.multi = 1
        self.ksr = 0
        self.eg_type = 0
        self.wave = 0
        self.vol_db = 0.0
        self.attack = 0
        self.decay = 0
        self.sustain = 0
        self.release = 0
        self.phase = 0.0
        self.env = 96.0                 # dB
        self.state = 'off'              # off/attack/decay/sustain/release
        self.keyon = False

    def key_on(self):
        if not self.keyon:
            self.phase = 0.0
        self.keyon = True
        self.state = 'attack'

    def key_off(self):
        self.keyon = False
        if self.state != 'off':
            self.state = 'release'

    def eg_tick(self):
        if self.state == 'off':
            return
        if self.state == 'attack':
            step = 0.25 * (1 << self.attack)
            self.env -= step
            if self.env <= 0.0:
                self.env = 0.0
                self.state = 'decay'
        elif self.state == 'decay':
            step = 0.25 * (1 << self.decay) / 8.0
            self.env += step
            if self.env >= self.sustain * 3.0:
                self.env = self.sustain * 3.0
                if self.eg_type:
                    self.state = 'release'
                else:
                    self.state = 'sustain'
        elif self.state == 'release':
            step = 0.25 * (1 << self.release) / 8.0
            self.env += step
            if self.env >= 96.0:
                self.env = 96.0
                self.state = 'off'
        # sustain: hold

    def amp(self, fnum, block):
        if self.state == 'off':
            return 0.0
        db = self.env + self.vol_db
        return 10.0 ** (-db / 20.0)


class Renderer:
    def __init__(self, fps=60.0, depth=1.0):
        self.fps = fps
        self.depth = depth
        self.ops = [Op() for _ in range(18)]
        self.chan = [{'fnum': 0, 'block': 0, 'keyon': False,
                      'alg': 0, 'fb': 0} for _ in range(9)]
        self.regs = {}
        self.samples_per_frame = SR / fps

    def apply(self, reg, val):
        self.regs[reg] = val
        if 0x20 <= reg <= 0x28:
            op = self.ops[reg & 0xF]
            op.multi = val & 0xF
            op.eg_type = (val >> 5) & 1
        elif 0x30 <= reg <= 0x38:
            op = self.ops[9 + (reg & 0xF)]
            op.multi = val & 0xF
            op.eg_type = (val >> 5) & 1
        elif 0x40 <= reg <= 0x48:
            op = self.ops[reg & 0xF]
            op.vol_db = 0.75 * (val & 0x3F)
        elif 0x50 <= reg <= 0x58:
            op = self.ops[9 + (reg & 0xF)]
            op.vol_db = 0.75 * (val & 0x3F)
        elif 0x60 <= reg <= 0x68:
            op = self.ops[reg & 0xF]
            op.attack = (val >> 4) & 0xF
            op.decay = val & 0xF
        elif 0x70 <= reg <= 0x78:
            op = self.ops[9 + (reg & 0xF)]
            op.attack = (val >> 4) & 0xF
            op.decay = val & 0xF
        elif 0x80 <= reg <= 0x88:
            op = self.ops[reg & 0xF]
            op.sustain = (val >> 4) & 0xF
            op.release = val & 0xF
        elif 0x90 <= reg <= 0x98:
            op = self.ops[9 + (reg & 0xF)]
            op.sustain = (val >> 4) & 0xF
            op.release = val & 0xF
        elif 0xE0 <= reg <= 0xE8:
            self.ops[reg & 0xF].wave = val & 3
        elif 0xF0 <= reg <= 0xF8:
            self.ops[9 + (reg & 0xF)].wave = val & 3
        elif 0xA0 <= reg <= 0xA8:
            self.chan[reg & 0xF]['fnum'] = (self.chan[reg & 0xF]['fnum'] & 0x300) | val
        elif 0xB0 <= reg <= 0xB8:
            ch = reg & 0xF
            c = self.chan[ch]
            c['fnum'] = (c['fnum'] & 0xFF) | ((val & 3) << 8)
            c['block'] = (val >> 2) & 7
            on = bool(val & 0x20)
            m, car = self.ops[SLOT_MOD[ch]], self.ops[9 + SLOT_MOD[ch]]
            if on and not c['keyon']:
                m.key_on(); car.key_on()
            elif not on and c['keyon']:
                m.key_off(); car.key_off()
            c['keyon'] = on
        elif 0xC0 <= reg <= 0xC8:
            ch = reg & 0xF
            self.chan[ch]['alg'] = val & 1
            self.chan[ch]['fb'] = (val >> 1) & 7

    def render_frame_events(self, events, n_samples):
        for reg, val in events:
            self.apply(reg, val)
        out = []
        acc = 0.0
        eg_every = max(1, int(round(SR / EG_TICK)))
        for i in range(int(n_samples)):
            acc += 1.0
            if acc >= eg_every:
                acc = 0.0
                for op in self.ops:
                    op.eg_tick()
            total = 0.0
            for ch in range(9):
                c = self.chan[ch]
                if not c['keyon'] and self.ops[9 + SLOT_MOD[ch]].state == 'off':
                    continue
                m = SLOT_MOD[ch]
                mod, car = self.ops[m], self.ops[9 + m]
                mf = opl_hz(c['fnum'], c['block']) * (1 << (mod.multi & 0xF)) / 16.0
                cf = opl_hz(c['fnum'], c['block']) * (1 << (car.multi & 0xF)) / 16.0
                mod.phase += 2.0 * math.pi * mf / SR
                mamp = mod.amp(c['fnum'], c['block']) * wave(mod.phase, mod.wave)
                if c['alg'] == 0:
                    car.phase += 2.0 * math.pi * (cf + mamp * mf * self.depth) / SR
                else:
                    car.phase += 2.0 * math.pi * cf / SR
                cw = wave(car.phase, car.wave)
                camp = car.amp(c['fnum'], c['block'])
                if c['alg'] == 0:
                    total += camp * cw
                else:
                    total += camp * cw + mamp
            out.append(total)
        return out


def main():
    ap = argparse.ArgumentParser(description='Lemmings AdLib driver player')
    ap.add_argument('--tune', type=int, default=1)
    ap.add_argument('--frames', type=int, default=500)
    ap.add_argument('--wav', default=None)
    ap.add_argument('--fps', type=float, default=60.0)
    ap.add_argument('--depth', type=float, default=1.0)
    ap.add_argument('--tempo', type=int, default=None,
                    help='call AH=4 with this tempo once, 10 frames in')
    args = ap.parse_args()

    dat = os.path.join(os.path.dirname(__file__), '..',
                       'Users', 'ericl', 'AppData', 'Local', 'Temp',
                       'opencode', 'lemmings-work', 'original', 'adlib.dat')
    if not os.path.exists(dat):
        dat = os.path.join(os.path.dirname(__file__), 'adlib.dat')
    data = open(dat, 'rb').read()
    image = decompress_section(data)
    print('decompressed to %d bytes' % len(image))

    drv = Driver(image)
    drv.init()
    drv.set_tune(args.tune)
    drv.start()
    print('init+set+start: %d events' % len(drv.events))

    frame_events = []
    for f in range(args.frames):
        n0 = len(drv.events)
        drv.update()
        frame_events.append(drv.events[n0:])
        if args.tempo is not None and f == 10:
            drv.set_tempo(args.tempo)
        if f < 12 or f % 50 == 0:
            print('frame %d events %d' % (f, len(drv.events)))
    print('TOTAL %d events, %d frames' % (len(drv.events), len(frame_events)))
    if not args.wav:
        for e in drv.events[:30]:
            print('  %02X <- %02X' % e)
        return

    rnd = Renderer(fps=args.fps, depth=args.depth)
    import array
    samples = array.array('f')
    for fe in frame_events:
        samples.extend(rnd.render_frame_events(fe, rnd.samples_per_frame))
    peak = max(abs(s) for s in samples) or 1.0
    scale = 0.85 / peak
    with wave.open(args.wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(
            struct.pack('<h', int(max(-1.0, min(1.0, s * scale)) * 32767))
            for s in samples))
    print('wrote %s (%d samples, peak %.3f)' % (args.wav, len(samples), peak))


if __name__ == '__main__':
    main()
