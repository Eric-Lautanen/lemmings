# Lemmings DOS AdLib Music Driver — Reverse Engineering Findings

Status: **fully decoded and verified end-to-end against a CPU emulator** (emu8086.py).
Source file: `ADLIB.DAT` (decompressed size 22,125 bytes = 0x566D).

## 1. Public API (real-mode 8086, called with AX = function)

Entry point `0x0000`, dispatch on AH:

| AH | Function | Entry | What it does |
|----|----------|-------|--------------|
| 0 | Update (tick) | `0x0115` | Music sequencer step. Call every frame (or at game tick rate). |
| 1 | AdLib detect | `0x00A3` | Returns AL=1 if an OPL2 (YM3812) is present, AL=0 otherwise. |
| 2 | Init | `0x003A` | Key-off the channel count `w(0x0B6C)` channels (1 in the raw image), then the 27-pair reset table at `0x006D` (RR=0F for all 18 valid ops, interleaved B0-B8 key-offs), clear channel active flags. |
| 3 | Set tune | (sets `[0x0ED]`) | Select tune number in AL (tune 1..20). |
| 4 | Tempo override | (sets `[0x0F0]`) | Write tempo override byte (0xFF = none). Driver picks it up in the update. |
| 5 | Start playback | `0x0500` | Pure kick-clear: `[0x0EE] = 0`. No OPL writes. The tune-start prelude (9 key-offs, then `0x01=0x20`, `0xBD=0xC0`, `0x08=0x00`, `0x04=0x21`) is emitted by `load_tune` on the next update. |

Registers in/out: `AX` only. Driver is position-independent (all offsets are 16-bit).

## 2. Global memory map

| Address | Size | Meaning |
|---------|------|---------|
| `0x0ED` | byte | Selected tune number (AH=3) |
| `0x0EE` | byte | Tune-request latch (AH=5 start; also "playing" flag) |
| `0x0EF` | byte | Pending-tune flag; update re-inits when non-zero |
| `0x0F0` | byte | Tempo override (AH=4; 0xFF = disabled) |
| `0x5A8` | word | Tune header word 0 (0x4400) |
| `0x5AC+0x14k` | 20 bytes ×9 | Channel structs (see §5) |
| `0x8A7` | 128 bytes | Volume table (see §6) |
| `0x927+0x20·k` | words | Freq table for semitone k (0..11) (see §7) |
| `0xAA7` | 256 bytes | Note table A: octave index (= idx/12) |
| `0xB07` | 256 bytes | Note table B: semitone index (= idx%12, 0..11 repeating) |
| `0xB68` | word | Voice table base = `0xB6E + word[tune_hdr+2]` (set by AH=5; 0xDFA for tune 1) |
| `0xB6A` | byte | Tempo (0x07 for tune 1) |
| `0xB6B` | byte | Tempo countdown counter (decremented each update; reloaded from 0xB6A) |
| `0xB6C` | word | Channel count (written by AH=5 from tune header; 4 for tune 1). Also doubles as the junk tune-0 slot of the tunes list. |
| `0xB6C+2` | words | Tunes list: 20 pointers to tune headers (tune 1 → `0xB98`, …, tune 20 → `0x5337`) |

## 3. Tune data format

```
tunes list @0xB6C:  [word 0x0001 junk][20 × word tune-hdr pointers]

tune header @0xB98 (tune 1):
  +0  word 0x4400            (stored to [0x5A8]; purpose unknown, maybe flags/tempo base)
  +2  word 0x028C            (voice-table offset; voice base = 0xB6E + this)
  +4  byte tempo             (0x07)
  +5  byte channel count     (0x04)
  +6  per-channel blocks, 0x20 bytes each:
        block ch N = 16 words: [sec_hdr_offset1..16], terminated by 0x0000

section header:  the word at 0xB6E + offset:
  +0  word section-stream offset  (stream address = 0xB6E + this word)
  +2..  further section-stream offsets; list ends with word 0x0000
        (this doubles as the "next section" list the 0x80 command walks)
```

For tune 1 ch0: block words `0x38, 0x52, 0x6C, 0x86, 0xD7, 0x102, 0x102, 0x139, 0x139, 0x170, 0x170, 0xA0, 0xA0, 0x139, 0x139, 0x0000` at `0xB9E` → hdrs at `0xBA6, 0xBC0, 0xBDA, 0xBF4, 0xC45, ...`; first section stream = `0xB6E + word[0xBA6] = 0xB6E + 0xD7 = 0xC45`.

Verified ch0 first section stream bytes @0xC45:
`C3 E0 23 23 E7 23 E0 23 23 E1 23 80` (repeats forever — the tune loops).

## 4. Stream command set (fetcher at 0x19E)

Fetcher reads a byte from `[di+12]` (stream ptr), dispatch:

| Byte | Command | Detail |
|------|---------|--------|
| `0x00–0x7F` | Note (1-byte) | Key-off (from stored B0), freq calc + key-on (A0/B0), duration = `[di+17]` |
| `0x80` | Loop/section | `0x415`: loop back via count word at loop ptr, else follow to next section |
| `0x81` | Note end | `0x1C0`: key-off, `[di+19]=0`, reset duration, ret |
| `0x82` | Rest | `0x1B3`: store stream ptr, reset duration, ret (no note change) |
| `0x83` | Silence all | `0x3AA` |
| `0x84` | Channel off | `0x430`: key-off + `[di+16]=0` |
| `0x85` | Channel off | `0x43A`: variant, also key-off + `[di+16]=0` |
| `0x86` | Slide up | `0x447`: `[di+19]=1` (note +1 per tick) |
| `0x87` | Slide down | `0x44F`: `[di+19]=0xFF` (note −1 per tick) |
| `0x88` | Section follow | `0x3FA`: advance to next section via hdr list |
| `0xB0–0xBF` | Volume (2-byte) | Next byte = volume → `[di+14]`, rewrites 0x40/0x48 |
| `0xC0–0xDF` | Note + voice (1-byte) | Select voice `(cmd−0xC1)*16 + voice_base`, write voice regs, `[di+18]=voice[8]`, then fetch note |
| `0xE0–0xEF` | Duration (1-byte) | `[di+17] = cmd−0xDF` (1..16), then fetch note |

The jump table for 0x80–0x87 lives at `0x3EA`.

## 5. Channel struct (0x5AC + 0x14·ch, 9 channels; OPL ch = N for N<9)

| Off | Meaning |
|-----|---------|
| +0  | current note byte |
| +1  | duration counter (decremented once per tempo-cycle) |
| +2  | voice record pointer (word) |
| +4  | last C0–DF note index |
| +5..6| mod offset + car offset bytes (the true YM3812 register offsets) |
| +7  | channel number |
| +8..9| last B0+ch write: (value<<8) | reg (used for key-offs) |
| +10 | loop ptr (word): pointer into section-header list (hdr+2 initially) |
| +12 | stream ptr (word) |
| +14 | volume (0x7F = max) |
| +15 | carrier volume offset |
| +16 | active flag (0 off, 1 on; 2 = special) |
| +17 | duration cache (set by E0–EF / refetch) |
| +18 | freq offset = voice[8] (0xE0 for ch0/tune1) |
| +19 | slide step (0 off, 1 up, 0xFF down) |

Channel pairs (mod, car) = ch-struct +5/+6, stored in the raw image:

| ch | mod off | car off | OPL regs |
|----|---------|---------|----------|
| 1 | 0x00 | 0x03 | 0x20 / 0x23 |
| 2 | 0x01 | 0x04 | 0x21 / 0x24 |
| 3 | 0x02 | 0x05 | 0x22 / 0x25 |
| 4 | 0x08 | 0x0B | 0x28 / 0x2B |
| 5 | 0x09 | 0x0C | 0x29 / 0x2C |
| 6 | 0x0A | 0x0D | 0x2A / 0x2D |
| 7 | 0x10 | 0x13 | 0x30 / 0x33 |
| 8 | 0x11 | 0x14 | 0x31 / 0x34 |
| 9 | 0x12 | 0x15 | 0x32 / 0x35 |

This is the real YM3812 layout (operator offsets 0x20..0x35, dead 0x26/0x27/
0x2E/0x2F): it matches the raw ADLIB.DAT bytes exactly, and the driver reads
those bytes at runtime without rewriting them. (An earlier bogus
`dl=ch, dh=ch+8` overwrite in the port polluted every trace; it has been
removed from the emulator harness, the Python reference, and the web port.)

## 6. Volume pipeline (verified)

Volume table at `0x8A7`, 128 bytes: `3F 3F 3E 3E 3D 3D … 01 01 00 00`
(i.e. `table[i] = 0x3F − i/2` — index = attenuation, 0x7F → 0x00 = loudest).

Writes (dl = struct+5 mod offset, dh = struct+6 car offset):
- `OUT(0x40+dl, table[vol & 0x7F] | ((voice[12] << 2) & 0xC0))` — modulator
- `OUT(0x40+dh, table[(vol + voice[11]) & 0x7F] | ((voice[12] ror 2) & 0xC0))` — carrier

Verified: vol 0x7F → 0x00 written; vol 0x00 → 0x3F written. (Inverted volume mapping.)

## 7. Frequency pipeline (verified end-to-end)

At 0x349–0x3A7 (per channel, on note-on and on every tick when sliding):

```
idx   = (note + [di+18] + 4) & 0xFF        ; [di+18] = voice[8] (0xE0 for tune1 ch0)
oct   = tableA[idx]  (0xAA7)  = idx/12     ; table: 12×0, 12×1, 12×2, …
semi  = tableB[idx]  (0xB07)  = idx%12     ; table: 0,1,2,…,11 repeating
word  = word[0x927 + semi*32]              ; semi 0..11:
                                            ; 0x02B2 0x02DB 0x0306 0x0334 0x0365 0x0399
                                            ; 0x03CF 0xFE05 0xFE23 0xFE44 0xFE67 0xFE8B
bl    = oct
if word >= 0x8000: bl += 1                  ; (sign check via `or ax,al` / jge)
if bl >= 0x80: bl += 1; word &= 0xFF; word >>= 1   ; (effectively dead path)
OUT(0xA0+ch, word & 0xFF)
OUT(0xB0+ch, 0x20 | ((word >> 8) & 3) | (bl << 2))   ; key-on
```

Key-off = the same B0 without the 0x20 bit (driver keeps last write in `[di+8]`).

Verified against the emulator: ch0 note 0x23 → idx 7 → oct 0, semi 7 → word 0xFE05 →
`A0=0x05, B0=0x22` — exactly the observed OPL writes. Note 0x23+0xE0+4 = 0x107 & 0xFF = 7.
(The "0xFE.." words are intentional: bit 15 triggers `bl+1`, and `(word>>8)&3` supplies freq bits 8-9.)

## 8. Voice records

Voice base = `0xB6E + word[tune_hdr+2]` (= 0xDFA for tune 1). Records are 16 bytes
(`(cmd−0xC1)*16 + base` for C0–DF commands; ch0's C3 → record at 0xE1A, verified in struct).

| Off | OPL reg | Meaning |
|-----|---------|---------|
| +0, +1 | 0x60+dl / 0x60+dh | kbd-scale / attack |
| +2, +3 | 0x80+dl / 0x80+dh | sustain / release |
| +4, +5 | 0x20+dl / 0x20+dh | tremolo/vibrato/EG |
| +6, +7 | 0xE0+dl / 0xE0+dh | waveform |
| +8 | — | freq offset added to note (0xE0 for ch0) |
| +9 | 0xC0+ch | feedback / algorithm |
| +10 | — | volume (0x7F for ch0) |
| +11 | — | carrier volume offset (0 for ch0) |
| +12 | — | ADSR/level bits (<<2 for mod, ror 2 for car) |

## 9. Sequencing / timing (verified)

- Each update (AH=0): tempo counter `[0xB6B]` decremented; when it hits 0 it reloads from
  `[0xB6A]` and channel durations decrement. Verified cadence: note-ons every 7 frames
  (tempo 7, duration 1).
- Duration counter `[di+1]` at 0 → fetch next command (key-off via stored B0, then new note).
- Tune loops: when the tune ends, `[0xEF]` becomes non-zero; the update's `0x457` routine
  re-initializes and restarts the same tune. Verified: full init+start replay at frame 61
  (~8.7 s) for tune 1.
- Pitch slide: with `[di+19]` = ±1, each tick adds it to the note and re-runs the freq calc
  (0x339 → 0x349).

## 10. Tools / infrastructure

- `emu8086.py` — 8086 CPU emulator for the driver (call by entry address; out_cb/in_cb hooks).
- `dis2.py` — disassembler used for `dis_full.txt` (0x0000–0x5E0) and `dis_freq.txt`.
  KNOWN BUGS: (a) prints `al`/`bl` instead of `ax`/`bx` for 16-bit ops (e.g. `8B F0` prints
  "mov si, al" = actually `mov si, ax`; `03 C0` prints "add ax, al" = actually `add ax, ax`);
  (b) jump-table region at 0x3EA decodes as garbage "jmp [si+]".
- Verified traces: `verify_freq3.py` (register-level freq check), `verify_loop.py` (looping),
  `trace_loop2.py` (section/loop pointers), plus earlier runtime traces.

## 11. Player implementation notes

To reproduce the sound in a modern player (e.g. for a game reimplementation):

1. Decompress ADLIB.DAT (LZW-ish scheme, see emu8086.load_driver — 22,125 bytes).
2. At init: write the 27-word init table (registers 0x01/0x04/0x60/0x70/0x80/0x90/0xE0/0xF0/0xC0/0x20/0x30/0x40/0x50 …).
3. Parse tune: header → tempo, voice base; per-channel section lists; streams.
4. Every game tick: tempo countdown → decrement durations → fetch commands.
5. Voice changes (C0–DF): apply the 10 OPL register writes from the voice record.
6. Volume: use the 0x8A7 table (inverted: 0x7F = loudest).
7. Freq: the §7 formula (A0 = word&0xFF, B0 = 0x20|((word>>8)&3)|(oct<<2), oct adjusted
   when word ≥ 0x8000). Note+voice[8]+4 gives idx; oct = idx/12, semi = idx%12.
8. Loop sections via 0x80, loop the whole tune via re-init.
9. Tempo override: 0xF0 byte (0xFF = none) can be fed by the game for speed-up effects.

The driver is self-contained: no game data is read; the game only sets tune/tempo/start.

## 12. JS port (web/)

`web/adlib.js` (pure JS, no deps, browser + Node) implements the driver step-for-step:

- `Driver` — mirrors every routine of the Python reference (`adlib_player.py`): the
  6.6 KiB working-memory image is decoded from `adlib_data.js` (base64 of the 22,125-byte
  decompressed `ADLIB.DAT`), tune parsing, tempo metronome, stream fetcher, volume/freq
  pipelines. `update()` fills a per-tick event list `[[reg, value], ...]` exactly as the
  emulator-traced reference does.
- `OplRenderer` — OPL2-style FM (log-domain sine table, 4-stage ADSR, feedback, algorithm);
  op indexing is the true YM3812 operator map: offsets {0,1,2,3,4,5,8,9,0A,0B,0C,0D,10..15}
  → op numbers 0..17, channel pairs (mod,car) in op numbers
  [0,1,2,6,7,8,12,13,14] / [3,4,5,9,10,11,15,16,17]; dead offsets (0x26/0x27/0x2E/0x2F)
  are ignored, so SFX on channel 9 (door: voice at 0x32/0x35, keyed 0xB8) renders
  correctly.
- `AdlibAudio` — Web Audio glue: `playTune(1..21)` (uses AH=2/3/5 like the DOS game),
  `playSfx(1..18)` (AH=4 tempo/SFX trigger), `toggleMute()`. AudioContext is created
  lazily and resumes on the first key/click (browser autoplay policy).

Verification: `dump_events_py.py` (reference) vs `dump_events_js.js` emit register traces
for all 21 tunes (600 ticks each), sfx1, sfx18 and tune-switching; the streams are
byte-identical (12,793 lines). Similarly `dump_sfx_py.py` vs `dump_sfx_js.js` cover the
SFX triggers — also byte-identical. Emulator ground truth (unpatched image): 60/120/40
frame sequences in `verify_player.py` / `verify_tempo.py` / `verify_api.py`,
`verify_api2.py` (re-init, tune 0 stop, tempo+switch) all report "ALL FRAMES IDENTICAL"
against the real 8086 trace; the 600-tick note stream of tune 1 matches event-for-event
(666 events, 0 diffs). Engine regression:
`web/test_headless.js` (120 levels) and the audio smoke test (`test_audio_smoke.js`,
fake AudioContext honoring the browser autoplay policy — the ctx starts suspended and
only resumes via `AdlibAudio.unlock()` after a user gesture; boot does not force
resume, avoiding the "no audio until click" trap).

## 13. Tune identity map (from the driver's built-in debug key menu)
The decompressed image at 0x6AA..0x7C7 contains the debug player's key list:
A..U select tunes 1..21. Authoritative name mapping:
1 Awesome, 2 BeastI, 3 BeastII, 4 CanCan, 5 Doggie, 6 Lemming1, 7 Lemming2,
8 Lemming3, 9 Menace, 10 Mountain, 11 TenLemmings, 12 Tim1, 13 Tim2,
14 Tim3, 15 Tim4, 16 Tim5, 17 Tim6, 18 Tim7, 19 Tim8, 20 Tim9, 21 Tim10.
(The earlier "tunes list = 20 pointers" note missed tune 21 @ 0x5337;
tune_check accepts AL < 0x16, i.e. tunes 1..21.)

## 14. Per-level music selection (game side)
DOS Lemmings does not store music in the LVL file. Community-documented
behavior (VGMPF/Lemmix-Fandom): levels cycle through a fixed sequence of 17
tracks in play order; the four special-graphics levels override with their
exclusive songs (BeastI / BeastII / Menace / Awesome). Known special levels
in this data: Fun 22 (menu 21) BeastI=2, Tricky 14 (menu 43) Menace=9,
Taxing 15 (menu 74) Awesome=1, Mayhem 22 (menu 111) BeastII=3.
web/game.js implements: spec[n] || CYCLE[n % 17].
