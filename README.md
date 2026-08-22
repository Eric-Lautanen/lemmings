# Lemmings (DOS, 1991) — faithful web port

A 1:1 reimplementation of the original DOS **Lemmings** engine, driven by the
game's own data files. No redrawn assets, no approximated level data — every
terrain piece, object frame, animation, sound effect and music tune is decoded
from the original files at build time.

> **Requires the original DOS Lemmings files.** Place them in `original/` and
> run `python tools/build_bundle.py`. They are not included in this repo
> (© Psygnosis / DMA Design).

## Run

```
python tools/build_bundle.py   # decode original/*.dat -> assets.js (once)
python -m http.server          # then open http://localhost:8000
```

## Tests

```
node tests/test_headless.js    # 120 levels crash-free + behavior + authentic Fun 7 win
node tests/test_skills.js      # all eight skills engage and act
node tests/test_render.js && python tools/compare_render.py
                               # JS render == independent Python decoder, pixel-exact
node tests/test_audio_smoke.js # OPL driver boot + autoplay-unlock flow
```

## Fidelity highlights

- **Engine** ported from the DOS-faithful Lemmix source: 17 Hz ticks, exact
  fall/float/climb/bash/mine/dig/build physics, DOSORIG quirks preserved
  (FallerStartsWith3, MinerOneWayRightBug, SplattingExitsBug,
  DisableObjectsAfter15, entrance ABBA order …).
- **Sound**: the real AdLib driver image executes step-for-step; register
  streams verified byte-identical against an 8086 emulator trace. Samples are
  rendered by a vendored MIT OPL3 core at its native clock. Music follows the
  documented DOS per-level rotation with the four special-level themes.
- **Graphics**: terrain/object draw flags, palette scaling and panel layout
  verified pixel-exact against native gameplay captures.

See [`AGENTS.md`](AGENTS.md) for detailed engineering notes and
[`tools/audio/adlib_driver_findings.md`](tools/audio/adlib_driver_findings.md)
for the driver reverse-engineering.

## Controls

`1..8` skills · click a lemming to assign · `+/-` release rate · `←/→` level ·
`P` pause · `N` nuke · `F` fast-forward · `M` music · `S` sfx · `R` retry ·
`Enter` next level

## Credits

Game by DMA Design, published by Psygnosis 1991. This is an interoperability /
preservation project. OPL3 core: [doomjs/opl3](https://github.com/doomjs/opl3)
(MIT). Engine semantics cross-checked against
[Lemmix](https://github.com/ericlangedijk/Lemmix) and ccexplore's DOS
documentation.
