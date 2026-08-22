# AGENTS.md — working state

## Objective
- Web port of DOS Lemmings (Psygnosis, 1991) driven 1:1 by the files in `original/`.
- **2026-08 full audit vs Lemmix source complete.** Engine rewritten to DOS-exact
  mechanics; data pipeline fixes verified against native DOS captures; all scripts
  migrated from AppData temp into `tools/`; tests green.

## Verified-correct facts (authoritative, do not regress)
- **Terrain flags** (`tools/capture/flag_test2.py`, empirically settled vs native
  capture vgalemmi_002): mods bits are `1=erase, 2=invert(flip vertical),
  4=no-overwrite` (Lemmix tdf_*). Forward draw order. The old "erase=2" belief and
  the "+64 piece id from b0 bit4" were WRONG; bit 4 is ignored by the original.
- **Palette = DAC value * 4** (NOT *255//63): verified pixel-exact vs captures
  (52→208, 44→176). Applied in `build_bundle.py vga_entry` + `extract_graphics.py`.
- **Coordinate convention**: web `lem.x ≡ DOS XPos`, `lem.y ≡ DOS YPos − 1`
  (derived from spawn parity `Left+24/Top+14` and landing semantics
  `solid(XPos,YPos)`); sprite box = `(XPos−FootX, YPos−FootY)` via ANIM_FOOT table;
  hit test = 12×12 at sprite top-left inclusive.
- **Fall**: constant ≤3px/iteration scan-down (no acceleration), Fallen starts at 3
  (FallerStartsWith3), +3/free-fall iteration, splat iff Fallen>60 on landing,
  silent death YPos>163; floater uses FloatParametersTable exactly (dy/frame per
  iteration, wrap 16→8), transition when Fallen>16 && IsFloater.
- **Nuke**: stops releases; assigns ExplosionTimer=79 one lem per tick in release
  order skipping removed/splatted/exploding; timer ticks in ANY action; at 0 →
  Exploding if fall/float/drown/vapor else Ohnoing; explosion mask (16x22) at
  (XPos−8, YPos−14) skipped over steel/water DOM.
- **End of level** (Lemmix CheckForGameFinished): time up OR removed>=total OR
  (nuked && out==0); success = trunc(saved*100/total) >= trunc(need*100/total).
  NO instant-win on reaching rescue count. Panel: OUT = alive lemmings,
  IN% = saved*100 div total.
- **Release rate** clamp [level rate, 99] for Slower/Faster (DOS AdjustReleaseRate).
- **Objects**: anim types 0 static /1 triggered trap /2 continuous /3 entrance;
  traps rest at frame start until fired, play one cycle, rest again; continuous
  advance every iteration; entrance starts frame start(=1 closed), animates at
  iteration 35 (+1/tick) wrapping to 0 (open) — capture-verified (door_test).
  DOM writes cover first 16 NON-ENTRANCE objects (DisableObjectsAfter15).
  Static bake two-pass: OnlyOnTerrain first; flag precedence OnlyOnTerrain >
  NoOverwrite (mods&0x40 wins over &0x80).
- **Builder**: 16-frame cycle; rises 1px BEFORE wall checks (frame 0);
  LayBrick at frame 9 or (10 && bricks==9): 6px single row at web row y,
  x..x+5 right / x−4..x+1 left, empty pixels only, color = palette entry 7
  (= graphic set custom[0], fBrickColor).
- **Miner**: 24-frame cycle; transition sinks 1px; frames 1/2 masks at
  web (x−8, y−12) and (x+dir−8, y−11) [DOS YPos−13/+1; a −11 base here carved
  the ground row below the feet → miner fell after one swing — fixed];
  frames 3 & 15 advance 2px; frame 3 sinks+fall/
  steel/oneway checks (MinerOneWayRightBug: ONEWAYRIGHT blocks both directions).
- **Basher**: sfx at swing END (frame 5); tunnel-clear check only raw frame 5
  (first cycle); masks 16x10 at (XPos−8, YPos−10) using pre-mirrored L/R arts.
- **Shrug animation** = shrug_r/shrug_l (NOT ohno). Umbrella = single 8-frame
  anims umbrella_r/l @0x3930/0x3C30 (preum folded in, FloatTable drives frames).
- **Hover word**: left strip shows "<ACTION> <count>" under cursor (DOS HitTest →
  SetInfoCursorLemming): WALKER/JUMPER/FALLER/FLOATER/CLIMBER/HOISTER/BUILDER/
  BASHER/MINER/DIGGER/BLOCKER/SHRUGGER/OHNOER/SPLATTER/EXITER/FRIER/DROWNER/BOMBER,
  ATHLETE for climber+floater. This solves the old "WALKER word" mystery.
- Panel layout/count cells/strip positions: see previous sessions, unchanged and
  still capture-verified.

## Fun 7 route (test_headless section 6, authentic DOS solution)
Floor → builder started at x∈[694,710] clears the 12px wall at x722 (stairs must
start ~25px before an obstacle; starting closer stalls 1px short) → mesa steps →
plateau → builder started at x∈[964,971] bridges the pit at x973..991 → exit.
rescued=34..44 of 50 needed 25. Followers climb 1px-per-2px stairs fine with the
DOS anchor-column probes.

## Layout (post-migration)
- `web/game.js` engine; `web/adlib.js`+`adlib_data.js` OPL driver; `web/assets.js`
  bundle (rebuilt by `python tools/build_bundle.py`; also writes build/).
- `tools/` build pipeline (build_bundle.py, datcommon.py, parse_lvl.py,
  extract_graphics.py, extract_main.py) + engine_reference.md (read it!).
- `tools/audio/` AdLib driver reverse-engineering suite (emu8086 traces, player,
  verifications; findings in adlib_driver_findings.md).
- `tools/capture/` terrain/render ground-truth tooling + truth_fun3.npy masks +
  `native/` DOS screenshots (og/vgalemmi/fun3 GIF frames). flag_test2.py settles
  terrain-flag questions empirically; final_capture_check.py re-validates palette
  + camera vs captures.
- `tools/panel/` panel-fidelity suite (pa7_* render/diff/click/nuke/rect).
- `tools/cdp/` Chrome DevTools Protocol smoke/animation tests (need headless Chrome).
- `tools/archive/` one-off exploration scripts (kept for archaeology only).
- `docs/reference/` manual PDF, shareware disk image, reference screenshots.

## Tests (all green after audit)
```
node --check web/game.js
node web/test_headless.js   # 120 levels crash-free + behavior + Fun7 win
node web/test_skills.js     # every skill engages and acts
node web/test_render.js     # dumps build/render/js_world_*.ppm
python tools/compare_render.py   # JS == Python renderer, 10/10 identical
python tools/cmp_slots.py        # menu stats vs lldb: 0 mismatches
node web/test_audio_smoke.js     # OPL driver boot + unlock flow
```

## Session 3: OPL3 core + music/SFX split + UI
- Vendored web/vendor/opl3.js (MIT, doomjs/opl3 = JS port of That Vintage
  Tone YMF262 emulator). New Opl3Renderer runs the chip at native 49716 Hz,
  linear-resamples to ctx rate; old hand-rolled renderer kept as fallback
  (MiniOplRenderer) when the vendor script is absent.
- AdlibAudio now runs TWO driver instances on two chips (music + sfx):
  playTune -> music driver, playSfx -> sfx driver; independent mute via
  setMusicOn/setSfxOn/toggleMusic/toggleSfx (_musicGainNow/_sfxGainNow).
  game.js: M toggles music, S toggles sfx; index.html has Music:/SFX: buttons.
- PC-speaker blips respect sfx mute. Makeup gain x2.2 with hard clamp in the
  audioprocess mixer (vendored chip runs quiet).
- index.html redesigned: centered column, panel bar with grouped controls +
  audio buttons + help/footer.

## Session 7: persistence + level nav + FF polish
- **localStorage** (try/catch guarded): keys lemmings.level / lemmings.music /
  lemmings.sfx. Level saved in doReset (numeric menu idx only); music/sfx saved
  in AdlibAudio.setMusicOn/setSfxOn. Boot: bindUI() first (populates dropdown),
  THEN gotoLevel(saved) so sel.value syncs - restoring before bindUI silently
  failed to select the dropdown entry.
- state.fast=false in doReset: FF never carries into a map selected any way
  (dropdown, arrows, prev/next, results-next).
- Prev/Next buttons flanking the dropdown (gotoLevel() shared by them,
  keyboard arrows, nextLevel).
- toggleMusic resumes a tune requested while muted (pendingTune consumed on
  re-enable) - previously re-enabling music stayed silent until next map.
- FF chip restyle: 11x11 recessed dark slot at x195..205 y+18..30 with dim
  chevrons; DOS-white border/chevrons when active; no longer touches the
  minimap frame. Click region x194..207.

## Session 6: object flags + results screen + controls
- **Animated objects ignored level draw flags**: per-frame path drew every
  opaque art pixel (overwrite), so NoOverwrite/OnlyOnTerrain water/lava/slime
  painted OVER terrain. Replaced objectCanvas for anims with drawAnimObject():
  run-length compositing against LIVE solid[] with the entry's mode
  (OnlyOnTerrain wins over NoOverwrite, matching Lemmix order). Stays correct
  as diggers carve the mask. objectCanvas() removed.
- **Results card**: slide-out notification in the upper-right of the game area
  (DOM element, CSS transition; NOT a canvas overlay - map stays visible).
  Badge + title (CLEARED/FAILED), Rescued/Required/Time-left rows,
  Retry/Next buttons wired to resetLevel/nextLevel. syncResultsUI() called
  from draw(); keyed on state.over so win->lose re-renders. Skill assignment
  and panel clicks blocked while shown (keys R/Enter still work).
- DOM Pause/Nuke/Fast buttons removed (redundant). In-canvas: PAUSE keeps a
  persistent DOS-style outline while paused; new FAST-FORWARD chip at
  x194..208 (double-chevron, amber fill + white outline when on, click or F).
  Tooltips extended to it ('FAST-FORWARD: ON/OFF').

## Session 5: UI polish
- Fast/Pause buttons show active state (accent highlight + label swap, class
  'active'); synced from click AND keyboard (syncBtns()).
- Camera edge-scroll now requires mouse over the FIELD (my < FIELD_H) and
  mouseleave clears mouseOn - no more scrolling while hovering the panel.
- Panel button tooltips: hovering Slower/Faster/skills/Pause/Nuke draws a
  small label near the cursor (drawn at device px via setTransform(1)).
- Count-cell digits blitted at 7x7 inside the 8x8 cell (deliberate cosmetic
  deviation, user request; zero-count cells stay full 8x8 solid DOS-white -
  AUTHENTIC: vgalemmi_002 capture shows identical white boxes for zero).
- NOTE: countCell canvases cached in module var cntCellCache.

## Session 4: object-animation + basher/miner field bugs
- **Map object animations were dead**: gfxSet cache stores frames/start but the
  objMap push read ob.n/ob.s (undefined) -> fr/start NaN in draw() so flames/
  water/spinners never animated. Fixed to ob.frames/ob.start. Verified: fr=6
  start=0 populated; continuous frames cycle 0..5.
- **Basher dug downward**: advance-phase slide-down moved BEFORE the ground
  check (DOS checks anchor solid first) -> sank ~1px per frame 11..15 tick
  through its own tunnel floor. Fixed to check-then-move (dip now <=2px per
  tunnel, terrain removal normal).
- **Trap sounds silent**: gfxSet cache lacked the snd byte; added snd: o.snd.
- Skill verify probe (tools/archive/web-dbg/dbg_skill_verify.js): anims cycle,
  trap snd wired, basher dip<=2 + removes terrain, miner 13+ swing cycles.

## Audio wiring (session 2, corrected to the DOS SFX table)
Lemmix Dos.Structures ose_* IS the DOS driver SFX numbering (1..18):
1 skill-select click, 2 entrance boing (iteration 34), 3 let's-go (15),
4 successful assign, 5 oh-no, 6/7/8/9/13/14/15 trap sounds, 10 hits-steel,
12 explosion, 16 exit yippee, 17 drowning, 18 builder warning (frame 10,
bricks<=3). Traps play their OWN groundxo sound byte (bundle obj.snd:
6/7/9/14/15 across sets) - never a blanket number. Tool sounds (digger/
miner/basher loops), nuke alarm are PC-SPEAKER on DOS, not AdLib SFX -
approximated with a square-wave blip module (spk*() in game.js). OPL
renderer: B0 fnum-high mask was 0x1F (block bits leaked into fnum =
octave-dependent detuning!) fixed to 0x03; KSR key-scaling added; FM
carrier PM depth pi with LINEAR signed mod output (log-domain regression
fixed); LIN_TABLE added. DSP probe: additive tone peaks at predicted
frequency; FM pair shows proper sidebands.

## Known remaining gaps (accepted / low priority)
- Lemming sprites' horizontal anchor uses DOS XPos directly now; captures show
  ±noise so pixel-diff vs GIF frames is not exact for sprites (terrain IS).
- Minimap interior style differs from DOS downscale (accepted since earlier).
- Fast-forward speed is approximate (DOS turbo varies by machine).
- Nuke alarm + countdown-beep exact PC-speaker waveforms unverified (any real
  capture would settle them); win/results fanfare not a driver SFX.

## Post-audit playability fixes (session 2, same day)
- **Central animation advance** (DOS HandleLemming): every action's Frame++
  happens once per iteration before the handler (except Floating/Digging);
  Once-anims set endOfAnimation which now drives shrug/ohno/exit/splat/drown/
  vapor/explode completion. Fixes the "gliding walkers" bug (walk frames froze
  on steps/jumps because only the flat-walk path advanced them). Hoist rises
  exactly 4x2px (frames 1..4), matching DOS.
- **World canvas invalidation**: terrain edits (dig/bash/mine masks, bricks,
  explosions) set L.worldDirty; worldCanvas() re-renders when dirty. Fixes
  invisible holes/stairs.
- **OPL renderer accuracy pass** (web/adlib.js): exponential-in-dB attack,
  linear-dB decay/release; tremolo/vibrato always follow their operator flags
  with DEEP registers selecting depth only (3.98 Hz trem triangle, 6.06 Hz
  stepped vibrato +-7/14 cents); channel feedback uses pre-envelope waveform;
  additive mode sums modulator+carrier. Probe: tune 1 renders rms .33 peak .90,
  no clipping/NaN (tools/archive/web-dbg/dbg_audio_probe.js).
