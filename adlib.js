// Lemmings AdLib sound: the DOS ADLIB.DAT driver (ported from the Python
// reimplementation) + an OPL2-style FM renderer, played through Web Audio.
// SFX (AH=4) and music share the driver exactly as in the original game.
(function (global) {
  'use strict';

  var CH0 = 0x05AC, TUNE_DATA = 0x0B6E, TEMPO_TABLE = 0x55E3, VOICE_TABLE_CH4 = 0x54E3;

  function decodeB64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // =====================================================================
  // Driver: faithful port of adlib_player.py (register stream).
  // =====================================================================
  function Driver(image) {
    this.m = new Uint8Array(image);
    this.events = [];
    // The image already carries the true per-channel operator offsets at
    // ch+5 (mod) and ch+6 (car); do not overwrite them.
  }
  Driver.prototype.b = function (a) { return this.m[a] & 0xFF; };
  Driver.prototype.w = function (a) { return this.m[a] | (this.m[a + 1] << 8); };
  Driver.prototype.sw = function (a, word) {
    this.m[a] = word & 0xFF;
    this.m[a + 1] = (word >> 8) & 0xFF;
  };
  Driver.prototype.out = function (reg, val) {
    this.events.push([reg & 0xFF, val & 0xFF]);
  };
  Driver.prototype.out_word = function (word) {
    this.out(word & 0xFF, (word >> 8) & 0xFF);
  };

  Driver.prototype.init = function () {
    this.silence_all();
    for (var i = 0; i < 27; i++) this.out(this.b(0x006D + i * 2), this.b(0x006D + i * 2 + 1));
    for (var k = 0; k < 9; k++) this.m[CH0 + k * 0x14 + 16] = 0;
  };

  Driver.prototype.silence_all = function () {
    var di = CH0;
    var n = this.w(0x0B6C);
    for (var i = 0; i < n; i++) {
      this.out_word(this.w(di + 8));
      this.m[di + 16] = 0;
      di += 0x14;
    }
    this.m[0x0ED] = 0;
  };

  Driver.prototype.set_tune = function (tune) { this.m[0x0ED] = tune; };
  Driver.prototype.set_tempo = function (tempo) { this.m[0x0F0] = tempo; };

  Driver.prototype.start = function () {
    // AH=5: pure kick-clear -> m[0x0EE] = 0; the tune-start prelude
    // (9 keyoffs + four control writes) is emitted by load_tune.
    this.m[0x0EE] = 0;
  };

  Driver.prototype.update = function () {
    this.tune_check();
    this.tempo_override();
    this.m[0x0B6B] = (this.m[0x0B6B] - 1) & 0xFF;
    for (var k = 0; k < 9; k++) this.tick(CH0 + k * 0x14);
    if (this.m[0x0B6B] === 0) this.m[0x0B6B] = this.m[0x0B6A];
  };

  Driver.prototype.tune_check = function () {
    if (this.m[0x0EE] === 0) this.m[0x0EF] = this.m[0x0ED];
    if (this.m[0x0EF] === 0) return;
    var tune = this.m[0x0EF];
    this.m[0x0ED] = 0;
    this.m[0x0EF] = 0;
    if (tune >= 0x16) {
      this.silence_all();
      if (this.onTuneEnd) this.onTuneEnd();
      return;
    }
    this.load_tune(tune);
  };

  Driver.prototype.load_tune = function (tune) {
    this.m[0x0EE] = tune;
    var si = 0x0B6C + tune * 2;
    si = this.w(si);
    this.m[0x05A8] = this.m[si];
    this.m[0x05A9] = this.m[si + 1];
    si += 2;
    this.sw(0x0B68, (this.w(si) + TUNE_DATA) & 0xFFFF);
    si += 2;
    this.m[0x0B6A] = this.m[si];
    si += 1;
    var chcount = this.m[si];
    si += 1;
    this.m[0x0B6C] = chcount;
    var di = CH0;
    for (var i = 0; i < chcount; i++) {
      var bx = (this.w(si) + TUNE_DATA) & 0xFFFF;
      si += 2;
      var stream = (this.w(bx) + TUNE_DATA) & 0xFFFF;
      bx += 2;
      this.m[di + 10] = bx & 0xFF;
      this.m[di + 11] = (bx >> 8) & 0xFF;
      this.m[di + 12] = stream & 0xFF;
      this.m[di + 13] = (stream >> 8) & 0xFF;
      this.m[di + 1] = 1;
      this.m[di + 16] = 1;
      di += 0x14;
    }
    for (var k = 0; k < 9; k++) this.out_word(this.w(CH0 + k * 0x14 + 8));
    this.out(0x01, 0x20);
    this.out(0xBD, 0xC0);
    this.out(0x08, 0x00);
    this.out(0x04, 0x21);
    this.m[0x0B6B] = 1;
  };

  Driver.prototype.tempo_override = function () {
    var bl = this.m[0x0F0];
    if (bl === 0 || bl >= 0x13) return;
    var di = 0x064C;
    var found = -1;
    for (var i = 0; i < 4; i++) {
      if (this.m[di + 16] === 0) { found = di; break; }
      di -= 0x14;
    }
    if (found < 0) return;
    this.m[0x0F0] = 0;
    this.m[found + 16] = 2;
    var bx = this.w(TEMPO_TABLE + bl * 2);
    this.m[found + 19] = 0;
    this.fetch(found, bx);
  };

  Driver.prototype.tick = function (di) {
    if (this.m[di + 16] === 0) return;
    var bx = this.w(di + 12);
    if (this.m[di + 16] !== 2 && this.m[0x0B6B] !== 0) return;
    this.m[di + 1] = (this.m[di + 1] - 1) & 0xFF;
    if (this.m[di + 1] === 0) {
      this.fetch(di, bx);
    } else {
      if (this.m[di + 19] !== 0) {
        this.slide(di);
        this.freq(di);
      }
      this.note_end_check(di, bx);
    }
  };

  Driver.prototype.slide = function (di) {
    var al = this.m[di + 19];
    if (al === 0) return;
    this.m[di] = (this.m[di] + al) & 0xFF;
  };

  Driver.prototype.note_end_check = function (di, bx) {
    if (this.b(bx) === 0x82) return;
    var si = this.w(di + 2);
    if (this.b(si + 14) !== this.m[di + 1]) return;
    this.out_word(this.w(di + 8));
    this.m[di + 19] = 0;
  };

  Driver.prototype.fetch = function (di, bx) {
    var al = this.b(bx);
    bx = (bx + 1) & 0xFFFF;
    if (al & 0x80) {
      if (al >= 0xE0) {
        this.m[di + 17] = al - 0xDF;
        this.fetch(di, bx);
      } else if (al >= 0xC0) {
        this.note_voice(di, bx, al);
      } else if (al >= 0xB0) {
        this.volume_cmd(di, bx, al);
      } else {
        this.cmd(di, bx, al);
      }
    } else {
      this.m[di] = al;
      this.out_word(this.w(di + 8));
      this.freq(di);
      this.m[di + 12] = bx & 0xFF;
      this.m[di + 13] = (bx >> 8) & 0xFF;
      this.m[di + 1] = this.m[di + 17];
    }
  };

  Driver.prototype.note_voice = function (di, bx, al) {
    al -= 0xC0;
    this.m[di + 4] = al;
    var idx = ((al - 1) & 0xFF) * 16;
    var base = di < 0x05FC ? this.w(0x0B68) : VOICE_TABLE_CH4;
    var si = (base + idx) & 0xFFFF;
    this.m[di + 2] = si & 0xFF;
    this.m[di + 3] = (si >> 8) & 0xFF;
    var dl = this.m[di + 5], dh = this.m[di + 6];
    this.out(0x60 + dl, this.b(si + 0));
    this.out(0x60 + dh, this.b(si + 1));
    this.out(0x80 + dl, this.b(si + 2));
    this.out(0x80 + dh, this.b(si + 3));
    this.out(0xE0 + dl, this.b(si + 6));
    this.out(0xE0 + dh, this.b(si + 7));
    this.out(0xC0 + this.m[di + 7], this.b(si + 9));
    this.out(0x20 + dl, this.b(si + 4));
    this.out(0x20 + dh, this.b(si + 5));
    this.m[di + 18] = this.b(si + 8);
    this.m[di + 14] = this.b(si + 10);
    var ah = this.b(0x08A7 + (this.b(si + 10) & 0x7F));
    var al2 = (this.b(si + 12) << 2) & 0xC0;
    this.out(0x40 + dl, ah | al2);
    this.m[di + 15] = this.b(si + 11);
    var bl = (this.b(si + 11) + this.b(si + 10)) & 0x7F;
    ah = this.b(0x08A7 + bl);
    al2 = ((this.b(si + 12) << 2) & 0xC0);
    al2 = ((al2 >> 2) | (al2 << 6)) & 0xFF;
    this.out(0x40 + dh, ah | al2);
    this.m[di + 18] = this.b(si + 8);
    this.fetch(di, bx);
  };

  Driver.prototype.volume_cmd = function (di, bx, al) {
    var vol = this.b(bx);
    bx = (bx + 1) & 0xFFFF;
    this.m[di + 14] = vol;
    var si = this.w(di + 2);
    var dl = this.m[di + 5], dh = this.m[di + 6];
    var ah = this.b(0x08A7 + (vol & 0x7F));
    var al2 = (this.b(si + 12) << 2) & 0xC0;
    this.out(0x40 + dl, ah | al2);
    var bl = (this.m[di + 15] + this.b(si + 10)) & 0x7F;
    ah = this.b(0x08A7 + bl);
    al2 = ((this.b(si + 12) << 2) & 0xC0);
    al2 = ((al2 >> 2) | (al2 << 6)) & 0xFF;
    this.out(0x40 + dh, ah | al2);
    this.fetch(di, bx);
  };

  Driver.prototype.cmd = function (di, bx, al) {
    var J = [0x0415, 0x01C0, 0x01B3, 0x03AA, 0x0430, 0x043A, 0x0447, 0x044F];
    var target = (al - 0x80) < 8 ? J[al - 0x80] : null;
    if (target === 0x0415) {
      this.loop_cmd(di);
    } else if (target === 0x01C0) {
      this.out_word(this.w(di + 8));
      this.m[di + 19] = 0;
      this.rest_cmd(di, bx);
    } else if (target === 0x01B3) {
      this.rest_cmd(di, bx);
    } else if (target === 0x03AA) {
      this.silence_all();
      this.m[0x0ED] = 0;
    } else if (target === 0x0430) {
      this.m[di + 18] = this.b(bx);
      this.fetch(di, (bx + 1) & 0xFFFF);
    } else if (target === 0x043A) {
      this.out_word(this.w(di + 8));
      this.m[di + 16] = 0;
    } else if (target === 0x0447) {
      this.m[di + 19] = 1;
      this.fetch(di, bx);
    } else if (target === 0x044F) {
      this.m[di + 19] = 0xFF;
      this.fetch(di, bx);
    }
  };

  Driver.prototype.rest_cmd = function (di, bx) {
    this.m[di + 12] = bx & 0xFF;
    this.m[di + 13] = (bx >> 8) & 0xFF;
    this.m[di + 1] = this.m[di + 17];
  };

  Driver.prototype.loop_cmd = function (di) {
    var bx = this.w(di + 10);
    var cx = this.w(bx);
    bx = (bx + 2) & 0xFFFF;
    if (cx === 0) {
      this.section_follow(di);
    } else {
      this.m[di + 10] = bx & 0xFF;
      this.m[di + 11] = (bx >> 8) & 0xFF;
      this.m[di + 12] = (cx + TUNE_DATA) & 0xFF;
      this.m[di + 13] = ((cx + TUNE_DATA) >> 8) & 0xFF;
      this.fetch(di, (cx + TUNE_DATA) & 0xFFFF);
    }
  };

  Driver.prototype.section_follow = function (di) {
    var bx = (this.w(di + 10) + TUNE_DATA) & 0xFFFF;
    var cx = this.w(bx);
    bx = (bx + 2) & 0xFFFF;
    this.m[di + 10] = bx & 0xFF;
    this.m[di + 11] = (bx >> 8) & 0xFF;
    var stream = (cx + TUNE_DATA) & 0xFFFF;
    this.m[di + 12] = stream & 0xFF;
    this.m[di + 13] = (stream >> 8) & 0xFF;
    this.fetch(di, stream);
  };

  Driver.prototype.freq = function (di) {
    var idx = (this.m[di] + this.m[di + 18] + 4) & 0xFF;
    var bl = this.b(0x0AA7 + idx);
    var semi = (this.b(0x0B07 + idx) * 32) & 0x1FF;
    var word = this.w(0x0927 + semi);
    bl -= 1;
    if (word >= 0x8000) bl += 1;
    if (bl < 0) {
      bl += 1;
      word >>= 1;
    }
    var ch = this.m[di + 7];
    this.out(0xA0 + ch, word & 0xFF);
    var ah = ((word >> 8) & 3) | ((bl << 2) & 0xFF);
    this.m[di + 8] = (0xB0 + ch) & 0xFF;
    this.m[di + 9] = ah;
    this.out(0xB0 + ch, ah | 0x20);
  };

  // =====================================================================
  // OPL2-style renderer (log-domain FM, YM3812 register map).
  // =====================================================================
  var MULT_TABLE = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 12, 12, 15, 15];

  // YM3812 register map: offsets 0x20..0x35, dead offsets 6/7/0xE/0xF.
  // Channel -> operator pairs (mod, car), op numbers 0..17.
  var CHAN_MOD = [0, 1, 2, 6, 7, 8, 12, 13, 14];
  var CHAN_CAR = [3, 4, 5, 9, 10, 11, 15, 16, 17];
  var OFF_TO_OP = [0, 1, 2, 3, 4, 5, -1, -1, 6, 7, 8, 9, 10, 11, -1, -1, 12, 13, 14, 15, 16, 17];

  function makeSinTable() {
    var t = new Float64Array(256);
    for (var i = 1; i < 256; i++) {
      var v = Math.sin(Math.PI / 2 * i / 255);
      t[i] = -Math.log2(v) * 256;
    }
    t[0] = 4084;
    return t;
  }
  function makeLinTable() {
    var t = new Float64Array(256);
    for (var i = 0; i < 256; i++) t[i] = Math.sin(Math.PI / 2 * i / 255);
    return t;
  }
  function makeInvTable() {
    var t = new Float64Array(256);
    for (var i = 0; i < 256; i++) t[i] = Math.pow(2, -i / 256);
    return t;
  }
  var SIN_TABLE = makeSinTable();
  var LIN_TABLE = makeLinTable();
  var INV_TABLE = makeInvTable();

  function exp2Neg(x) {
    if (x <= 0) return 1;
    var i = x | 0;
    if (i >= 16) return 0;
    var f = Math.round((x - i) * 256);
    if (f > 255) f = 255;
    return INV_TABLE[f] * Math.pow(2, -i);
  }

  function MiniOplRenderer(sampleRate) {
    this.sr = sampleRate || 44100;
    this.egEvery = this.sr / 1035.3;
    this.egAcc = 0;
    this.tremPhase = 0;
    this.vibPhase = 0;
    this.deepTrem = 1;
    this.deepVib = 1;
    this.ops = [];
    for (var i = 0; i < 18; i++) this.ops.push({
      valid: false, mult: 1, level: 0, ksl: 0, ar: 0, dr: 0, rr: 0, sl: 0, egt: 0,
      vib: 0, am: 0, ksr: 0, wave: 0, env: 4096, envState: 0, phase: 0, keyed: 0, prev: 0, prev2: 0, step: 0
    });
    this.chan = [];
    for (var c = 0; c < 9; c++) this.chan.push({
      mod: CHAN_MOD[c], car: CHAN_CAR[c],
      fnum: 0, block: 0, keyon: 0, fb: 0, alg: 0, modPrev: 0, modPrev2: 0
    });
  }

  // Envelope rate tables, calibrated for the 1035.3 Hz EG cadence above.
  // Attack: exponential approach to 0 dB reaching -60 dB in ATTACK_MS[r].
  // Decay/release: linear in dB (42.53 units = 1 dB), full scale 4096 ~ 96 dB.
  var ATTACK_MS = [1084.6, 646.3, 425.4, 254.5, 166.0, 94.9, 61.1, 34.9, 21.3, 12.1, 7.1, 4.3, 2.3, 1.4, 0.7, 0.4];
  var DECAY_MS = [2168.5, 1292.6, 850.8, 509.1, 332.0, 189.8, 122.2, 69.8, 42.6, 24.2, 14.2, 8.6, 4.6, 2.8, 1.4, 0.8];
  var EG_HZ = 1035.3;
  var ATTACK_K = [];
  var DECAY_STEP = [];
  for (var _r = 0; _r < 16; _r++) {
    ATTACK_K.push(1 - Math.exp(Math.log(0.001) / (ATTACK_MS[_r] * EG_HZ)));  // per-tick factor
    DECAY_STEP.push(4096 / (DECAY_MS[_r] * EG_HZ));
  }

  MiniOplRenderer.prototype.opByOff = function (off) {
    if (off < 0 || off >= OFF_TO_OP.length) return null;
    var n = OFF_TO_OP[off];
    if (n < 0) return null;
    var o = this.ops[n];
    o.valid = true;
    return o;
  };

  MiniOplRenderer.prototype.apply = function (reg, val) {
    var c, o;
    if (reg >= 0x20 && reg <= 0x35) {
      o = this.opByOff(reg - 0x20);
      if (!o) return;
      o.mult = MULT_TABLE[val & 0xF];
      o.vib = (val >> 6) & 1;
      o.am = (val >> 7) & 1;
      o.egt = (val >> 5) & 1;
      o.ksr = (val >> 4) & 1;
      return;
    }
    if (reg >= 0x40 && reg <= 0x55) {
      o = this.opByOff(reg - 0x40);
      if (!o) return;
      o.ksl = (val >> 6) & 3;
      o.level = (val & 0x3F) << 5;
      return;
    }
    if (reg >= 0x60 && reg <= 0x75) {
      o = this.opByOff(reg - 0x60);
      if (!o) return;
      o.ar = (val >> 4) & 0xF;
      o.dr = val & 0xF;
      return;
    }
    if (reg >= 0x80 && reg <= 0x95) {
      o = this.opByOff(reg - 0x80);
      if (!o) return;
      o.sl = val >> 4;
      o.rr = val & 0xF;
      return;
    }
    if (reg >= 0xE0 && reg <= 0xF5) {
      o = this.opByOff(reg - 0xE0);
      if (!o) return;
      o.wave = val & 3;
      return;
    }
    if (reg >= 0xA0 && reg <= 0xA8) {
      c = this.chan[reg - 0xA0];
      c.fnum = (c.fnum & 0x300) | val;
      return;
    }
    if (reg >= 0xB0 && reg <= 0xB8) {
      c = this.chan[reg - 0xB0];
      // B0: bit5 key-on, bits6-4 block, bits3-2 fnum high two bits
      c.fnum = (c.fnum & 0xFF) | ((val & 0x03) << 8);
      c.block = (val >> 2) & 7;
      var on = (val >> 5) & 1;
      if (on && !c.keyon) this.keyOn(c);
      if (!on && c.keyon) this.keyOff(c);
      c.keyon = on;
      return;
    }
    if (reg >= 0xC0 && reg <= 0xC8) {
      c = this.chan[reg - 0xC0];
      c.fb = (val >> 1) & 7;
      c.alg = val & 1;
      return;
    }
    if (reg === 0xBD) {
      this.deepTrem = (val >> 7) & 1;
      this.deepVib = (val >> 6) & 1;
    }
  };

  MiniOplRenderer.prototype.keyOn = function (c) {
    var m = this.ops[c.mod], r = this.ops[c.car];
    this.beginKey(m, r);
  };
  MiniOplRenderer.prototype.beginKey = function (m, r) {
    m.phase = 0; m.env = 4096; m.envState = 0; m.prev = 0; m.prev2 = 0;
    r.phase = 0; r.env = 4096; r.envState = 0; r.prev = 0; r.prev2 = 0;
  };
  MiniOplRenderer.prototype.keyOff = function (c) {
    var m = this.ops[c.mod], r = this.ops[c.car];
    if (m.envState !== 3) m.envState = 2;
    if (r.envState !== 3) r.envState = 2;
  };

  // key-scale-rate offset: effective rate = rate + ksv>>2, ksv = block*2 +
  // fnum MSBs (0..15); only when the operator's KSR flag is set
  MiniOplRenderer.prototype.ksrOff = function (o) {
    if (!o.ksr) return 0;
    var ksv = o.blockNow * 2 + (o.fnumNow >> 9);
    return ksv >> 2;
  };

  MiniOplRenderer.prototype.tickEg = function (o) {
    if (o.envState === 3) return;
    if (o.envState === 0) {
      // attack: exponential approach to 0 dB (slow->fast in dB, like the chip)
      var ar = Math.min(15, o.ar + this.ksrOff(o));
      if (ar === 0) return;                         // rate 0: never attacks
      o.env -= o.env * ATTACK_K[ar];
      if (o.env <= 0.5) { o.env = 0; o.envState = 1; }
      return;
    }
    if (o.envState === 1) {
      // decay: linear dB toward the sustain level
      var sl = (o.sl << 8) * 2;
      if (sl > 4096) sl = 4096;
      var dr = Math.min(15, o.dr + this.ksrOff(o));
      o.env += DECAY_STEP[dr];
      if (o.env >= sl) {
        o.env = sl;
        if (o.egt) o.envState = 3;
        else o.envState = 2;
      }
      return;
    }
    if (o.envState === 2) {                         // release: linear dB
      var rr = Math.min(15, o.rr + this.ksrOff(o));
      o.env += DECAY_STEP[rr];
      if (o.env >= 4096) { o.env = 4096; o.envState = 3; }
    }
  };

  MiniOplRenderer.prototype.process = function () {
    this.egAcc += 1;
    // OPL LFOs: tremolo 3.98 Hz (1.0 dB normal / 4.8 dB deep), applied to
    // operators with the AM flag; vibrato 6.06 Hz (+-7 cents normal,
    // +-14 cents deep) with the chip's stepped hold pattern, applied to
    // operators with the VIB flag.  Both run whenever their flag is set -
    // the DEEP register only selects the depth.
    this.tremPhase += 2 * Math.PI * 3.98 / this.sr;
    this.vibPhase += 2 * Math.PI * 6.06 / this.sr;
    if (this.tremPhase > 2 * Math.PI) this.tremPhase -= 2 * Math.PI;
    if (this.vibPhase > 2 * Math.PI) this.vibPhase -= 2 * Math.PI;
    var tp = this.tremPhase / (2 * Math.PI);          // 0..1
    var tremRamp = tp < 0.5 ? tp * 2 : 2 - tp * 2;    // triangle 0..1..0
    var dTrem = this.deepTrem ? 4.8 : 1.0;            // dB
    var vp = this.vibPhase / (2 * Math.PI);
    var vibStep = vp < 0.25 ? 0 : vp < 0.5 ? 1 : vp < 0.75 ? 0 : -1;
    var vibAmt = this.deepVib ? 0.0141 : 0.00706;     // relative pitch

    if (this.egAcc >= this.egEvery) {
      this.egAcc = 0;
      for (var i = 0; i < 18; i++) {
        if (this.ops[i].valid) this.tickEg(this.ops[i]);
      }
    }

    var sum = 0;
    for (var c = 0; c < 9; c++) {
      var ch = this.chan[c];
      var m = this.ops[ch.mod], r = this.ops[ch.car];
      if (!m.valid && !r.valid) continue;
      m.blockNow = ch.block; m.fnumNow = ch.fnum;
      r.blockNow = ch.block; r.fnumNow = ch.fnum;
      var base = (ch.fnum << ch.block) * 0.047408 / this.sr;
      var mres = this.opSample(m, base, vibStep, vibAmt, 0, ch.fb, ch.modPrev, ch.modPrev2, tremRamp, dTrem);
      ch.modPrev2 = ch.modPrev; ch.modPrev = mres.raw;
      // carrier phase-modulated by the modulator's linear output (+-pi rad)
      var cres = this.opSample(r, base, vibStep, vibAmt, mres.raw * Math.PI, 0, 0, 0, tremRamp, dTrem);
      // alg 0 = FM (carrier only); alg 1 = additive (modulator + carrier)
      var s = ch.alg ? (mres.out + cres.out) : cres.out;
      if (s !== 0 || r.envState !== 3) sum += s;
    }
    // YM3812 mixes the nine channels on a saturating 16-bit DAC.
    if (sum > 1) sum = 1;
    else if (sum < -1) sum = -1;
    return sum;
  };

  // opSample: advance one operator's phase and return {raw, out} where raw is
  // the signed waveform value before envelope/level (used for FM + feedback)
  // and out is the final attenuated sample.
  MiniOplRenderer.prototype.opSample = function (o, base, vibStep, vibAmt, fm, fb, p1, p2, tremRamp, dTrem) {
    if (!o.valid || o.envState === 3) { o.prev2 = o.prev; o.prev = 0; return { raw: 0, out: 0 }; }
    var v = o.vib ? 1 + vibStep * vibAmt : 1;
    var f = fm;
    if (fb > 0) f = (p1 + p2) * Math.PI / (1 << (8 - fb));
    o.phase += base * o.mult * 2 * Math.PI * v + f;
    var ph = o.phase % (2 * Math.PI);
    if (ph < 0) ph += 2 * Math.PI;
    var q = (ph / (2 * Math.PI) * 1024) | 0;
    var quad = q >> 8, i8 = q & 0xFF;
    var w = o.wave;
    var i, neg;
    if (w === 0) {
      i = (quad & 1) ? 255 - i8 : i8;
      neg = quad >= 2;
    } else if (w === 1) {          // half sine: silent in quadrants 2/3
      if (quad >= 2) { o.prev2 = o.prev; o.prev = 0; return { raw: 0, out: 0 }; }
      i = i8; neg = false;
    } else if (w === 2) {          // absolute sine
      i = (quad & 1) ? 255 - i8 : i8;
      neg = false;
    } else {                       // |sin(2 theta)|: doubled phase, folded
      var q2 = (q << 1) & 0x3FF;
      var quad2 = q2 >> 8, j = q2 & 0xFF;
      i = (quad2 & 1) ? 255 - j : j;
      neg = false;
    }
    // raw = signed LINEAR waveform value (-1..1): this is what feeds FM into
    // the carrier and the channel feedback path, exactly like the chip
    var raw = LIN_TABLE[i];
    if (neg) raw = -raw;
    // out = raw with log-domain attenuation applied (env/level/KSL/tremolo)
    var am = o.am ? tremRamp * dTrem * 42.53 : 0;
    var lin = exp2Neg((SIN_TABLE[i] + o.env + o.level + this.kslAtt(o) + am) / 256);
    if (neg) lin = -lin;
    o.prev2 = o.prev; o.prev = raw;
    return { raw: raw, out: lin };
  };

  // Key-scaling level: slope in dB per octave, zero at block 7 / fnum 0,
  // rising with pitch (clamped at 0). 42.53 units = 1 dB.
  MiniOplRenderer.prototype.kslAtt = function (o) {
    if (o.ksl === 0) return 0;
    var slope = (o.ksl === 1 ? 1.5 : o.ksl === 2 ? 3 : 6) * 42.53;
    var oct = o.blockNow + o.fnumNow / 1024 - 7;
    var a = slope * oct;
    return a > 0 ? a : 0;
  };

  // =====================================================================
  // OPL2/3 renderers.
  // =====================================================================

  // Primary: the vendored "That Vintage Tone" OPL3 core (MIT), running at
  // its native 49716 Hz and resampled linearly to the context rate.
  function Opl3Renderer(sampleRate) {
    this.sr = sampleRate;
    this.chip = new (typeof window !== 'undefined' ? window.OPL3Core : global.OPL3Core)();
    this.step = 49716 / sampleRate;
    this.pos = 0;
    this.prevL = 0; this.prevR = 0;
    this.curL = 0; this.curR = 0;
  }
  Opl3Renderer.prototype.apply = function (reg, val) {
    // all Lemmings driver writes target register bank 0 (OPL2 mode)
    this.chip.write(0, reg, val);
  };
  Opl3Renderer.prototype.process = function () {
    this.pos += this.step;
    while (this.pos >= 1) {
      this.prevL = this.curL; this.prevR = this.curR;
      this.chip.read();
      this.curL = this.chip.output[0] / 32768;
      this.curR = this.chip.output[1] / 32768;
      this.pos -= 1;
    }
    var f = this.pos;
    return ((this.prevL + (this.curL - this.prevL) * f) +
            (this.prevR + (this.curR - this.prevR) * f)) * 0.5;
  };

  // =====================================================================
  // Web Audio glue.
  // =====================================================================
  function AdlibAudio() {
    this.volume = 0.9;
    this.muted = false;
    this.musicOn = true;
    this.sfxOn = true;
    this.ctx = null;
    this.node = null;
    this.driver = null;      // music driver (kept for backwards compatibility)
    this.renderer = null;
    this.sfxDriver = null;
    this.sfxRenderer = null;
    this.samplePos = 0;
    this.nextTick = 0;
    this.tickGap = 0;
    this._musicGainNow = 1;
    this._sfxGainNow = 1;
  }

  AdlibAudio.prototype.init = function () {
    if (this.ctx) return;
    var scope = (typeof window !== 'undefined') ? window : global;
    var AC = scope.AudioContext || scope.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); }
    catch (e) { this.ctx = new AC(); }
    var image = decodeB64(scope.ADLIB_DRIVER_B64);
    // Two independent driver instances on two independent emulated chips:
    // one for music, one for SFX.  On real DOS hardware the SFX hijacked a
    // music channel on the single chip; separate chips give the same sound
    // character but let music and SFX be mixed and muted independently.
    this.driver = new Driver(image.slice());
    this.sfxDriver = new Driver(image.slice());
    if (typeof scope.OPL3Core === 'function') {
      this.renderer = new Opl3Renderer(this.ctx.sampleRate);
      this.sfxRenderer = new Opl3Renderer(this.ctx.sampleRate);
    } else {
      this.renderer = new MiniOplRenderer(this.ctx.sampleRate);
      this.sfxRenderer = new MiniOplRenderer(this.ctx.sampleRate);
    }
    this.driver.init();
    this.sfxDriver.init();
    // loop the tune: the DOS driver's end-of-tune writes [0xEF]=0xFF which
    // tune_check treats as "stop" — intercept it and restart instead
    var self = this;
    this.driver.onTuneEnd = function () {
      if (self.currentTune > 0 && self.musicOn) {
        self.driver.set_tune(self.currentTune);
        self.driver.start();
        self.tuneTick = 0;
        self._allWasOff = false;
      }
    };
    this.sfxDriver.onTuneEnd = null;  // SFX just stops
    this.applyGains();
    this.tickGap = this.ctx.sampleRate / 72.8261;
    this.currentTune = 0;
    this.tuneTick = 0;
    var self = this;
    this.node = this.ctx.createScriptProcessor(512, 0, 2);
    this.node.onaudioprocess = function (e) {
      var outL = e.outputBuffer.getChannelData(0);
      var outR = e.outputBuffer.getChannelData(1);
      var n = e.outputBuffer.length;
      // catch up on missed driver ticks (bounded so a throttled tab doesn't
      // dump a huge burst of events at once)
      var ticks = 0;
      while (self.samplePos >= self.nextTick && ticks++ < 6) {
        self._pumpDrivers();
        self.nextTick += self.tickGap;
      }
      for (var i = 0; i < n; i++) {
        if (self.samplePos >= self.nextTick) {
          self._pumpDrivers();
          self.nextTick += self.tickGap;
        }
        var v = self.renderer.process() * self._musicGainNow * 2.2;
        var s = self.sfxRenderer.process() * self._sfxGainNow * 2.2;
        var m = v + s;
        if (m > 1) m = 1; else if (m < -1) m = -1;
        outL[i] = m;
        outR[i] = m;
        self.samplePos++;
      }
    };
    this.node.connect(this.ctx.destination);
  };

  // Advance the music driver once, pushing register writes to its chip.
  AdlibAudio.prototype._pumpMusic = function () {
    this.driver.update();
    var ev = this.driver.events;
    for (var i = 0; i < ev.length; i++) this.renderer.apply(ev[i][0], ev[i][1]);
    ev.length = 0;
    // tune-end detection: DOS plays a tune once then runs its section lists
    // into garbage and eventually silence.  Neither produces a clean "end"
    // signal we can intercept in JS, so we detect the silence: count
    // consecutive ticks with zero music events; after ~3 s of silence the
    // tune is over — restart it from the top.
    if (this.currentTune > 0 && this.musicOn) {
      this.tuneTick++;
      var hadEvents = ev.length > 0;
      if (hadEvents) { this._silentTicks = 0; this.tuneTick = this.tuneTick; }
      else {
        this._silentTicks = (this._silentTicks || 0) + 1;
        if (this._silentTicks > 200 && this.tuneTick > 100) {
          this.driver.set_tune(this.currentTune);
          this.driver.start();
          this.tuneTick = 0;
          this._silentTicks = 0;
        }
      }
    }
  };

  // Advance the SFX driver once (separate from music so SFX triggers don't
  // advance the music driver's tempo counter, which caused note skipping).
  AdlibAudio.prototype._pumpSfx = function () {
    this.sfxDriver.update();
    var sv = this.sfxDriver.events;
    for (var j = 0; j < sv.length; j++) this.sfxRenderer.apply(sv[j][0], sv[j][1]);
    sv.length = 0;
  };

  // Advance both (used by the scheduled audio callback).
  AdlibAudio.prototype._pumpDrivers = function () {
    this._pumpMusic();
    this._pumpSfx();
  };

  AdlibAudio.prototype.applyGains = function () {
    this._musicGainNow = (this.musicOn && !this.muted) ? this.volume : 0;
    this._sfxGainNow = (this.sfxOn && !this.muted) ? this.volume : 0;
  };

  function prefSave(key, val) {
    try { localStorage.setItem('lemmings.' + key, JSON.stringify(val)); } catch (e) { }
  }
  AdlibAudio.prototype.setMusicOn = function (on) {
    this.musicOn = !!on;
    this.applyGains();
    prefSave('music', this.musicOn);
  };
  AdlibAudio.prototype.setSfxOn = function (on) {
    this.sfxOn = !!on;
    this.applyGains();
    prefSave('sfx', this.sfxOn);
  };
  AdlibAudio.prototype.toggleMusic = function () {
    this.setMusicOn(!this.musicOn);
    // a tune requested while muted starts as soon as music is re-enabled
    if (this.musicOn && this.pendingTune && this.driver) {
      this.driver.init();
      this.driver.set_tune(this.pendingTune);
      this.driver.start();
      this.pendingTune = null;
    }
    return this.musicOn;
  };
  AdlibAudio.prototype.toggleSfx = function () { this.setSfxOn(!this.sfxOn); return this.sfxOn; };

  // AH=3: play a tune (1..21). AH=2 then AH=3, then AH=5, like the DOS game.
  AdlibAudio.prototype.playTune = function (tune) {
    this.init();
    if (!this.driver || !this.musicOn) { this.pendingTune = tune; return; }
    this.unlock();
    this.driver.init();
    this.driver.set_tune(tune);
    this.driver.start();
    this.currentTune = tune;
    this.tuneTick = 0;
    this._allWasOff = false;
    // load + start the tune right now: first notes sound in the very next
    // output buffer instead of up to ~14 ms later
    this._pumpMusic();
  };

  // AH=4: play a sound effect (1..18) on the dedicated SFX chip/driver.
  AdlibAudio.prototype.playSfx = function (n) {
    this.init();
    if (!this.sfxDriver) return;
    this.sfxDriver.set_tempo(n);
    this.unlock();
    // start the effect stream now rather than at the next scheduled tick;
    // only the SFX driver is pumped so music tempo is unaffected
    this._pumpSfx();
  };

  // Browsers suspend the AudioContext until a user gesture; call this from
  // pointerdown/keydown/touchstart. The queued driver events then play from
  // wherever the song was left off (nothing renders while suspended).
  AdlibAudio.prototype.unlock = function () {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      var p = this.ctx.resume();
      if (p && p.catch) p.catch(function () {});
    }
  };

  AdlibAudio.prototype.toggleMute = function () {
    this.muted = !this.muted;
    return this.muted;
  };

  var api = {
    Driver: Driver,
    Opl3Renderer: Opl3Renderer,
    MiniOplRenderer: MiniOplRenderer,
    AdlibAudio: AdlibAudio,
    decodeB64: decodeB64
  };
  global.ADLIB = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
