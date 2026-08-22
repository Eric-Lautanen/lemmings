# Engine reference (extracted from Lemmix, DOS-faithful)

Source: ericlangedijk/Lemmix `src/Game.pas` (+ Dos.Consts.pas, Meta.Structures.pas, Game.Rendering.pas).
Lemmix is DOS-faithful (validated by ccexplore; replays match DOS). DOSORIG_MECHANICS applies:
DisableObjectsAfter15, MinerOneWayRightBug, SplattingExitsBug, OldEntranceABBAOrder,
FallerStartsWith3, Max4EnabledEntrances, AssignClimberShruggerActionBug, TriggeredTrapLemmixBugSolved.

## Timings
- 17 game iterations per second (clock: every 17 iterations, Seconds--). Level starts Minutes=timeLimit, Seconds=0.
- Iteration events: 15 => "let's go" sfx; 34 => entrance sfx; 35 => entrances open (Triggered=True, CurrentFrame=1); 55 => music.
- NextLemmingCountdown starts 20 (release counting only begins when entrances opened => first lemming at iteration 55).
- Release interval (ccexplore): frames = (99 - RR) div 2 + 4 (integer division; RR 99 and 98 identical).
- Spawn: XPos = entrance.Left + 24 (EntranceX25 mechanic adds +1; ORIG does NOT), YPos = entrance.Top + 14,
  xDelta = 1, starts as Falling with Fallen=3.
- Entrance order (ORIG, OldEntranceABBAOrder): 2 entrances => A B B A; 3 => A B C B; 4 => A B C D; else A A A A.
- Entrance animation: object anim type oat_Once; animates while Triggered: CurrentFrame++ each iteration,
  on CurrentFrame >= AnimationFrameCount => CurrentFrame=0, Triggered=False, entrance done (frame 0 = open hatch).
- Other objects: if Triggered or oat_Continuous: CurrentFrame++ each iteration; wrap at AnimationFrameCount => 0, Triggered=False.

## Terrain/world rendering (RenderWorld)
- World size: 1584 x 160 px buffer; level coords up to ~1600. Camera: left = ScreenPosition (startx), scroll in [startx..1584-320].
- Terrain draw (in level list order), per-piece combine function:
  - mods & 0x8 (draw_behind) => "no overwrite": pixel written only if target pixel has no terrain bit yet.
  - mods & 0x2 (erase)       => target pixel cleared to 0 where piece has a pixel.
  - else                    => overwrite: color replaced, terrain bit set.
  - mods & 0x4 (upside-down) => piece flipped vertically before draw.
  - World pixels have ALPHA_TERRAIN (bit 24) marker = solid for collision. Terrain color = piece color.
- Objects drawn after terrain: only-on-terrain objects first, then others. Object combine:
  - odf_OnlyOnTerrain (bit): draw pixel only where target already has terrain bit.
  - odf_NoOverwrite: only where alpha==0.
  - default: overwrite, object bit set.
  - odf_UpsideDown (byte6 0x80): flip object bitmap vertically.
  - Moving/triggered objects are re-drawn each frame over the terrain (frame from animation list).
- vgaspec special bitmap (custom_index>0): replaces ALL terrain; drawn at (304,0) with overwrite combine. Only 4 levels.

## Object map (DOM)
- 4px resolution over x in [-16..1647], y in [-16..175]; map cell = ReadObjectMap(x,y) = map[(x&~3)/4 + 16, (y&~3)/4 + 16].
- Written at level start:
  - Steel areas: DOM_STEEL (137) for each pixel of each steel rect.
  - For objects 0..min(15, count-1) (DisableObjectsAfter15!): trigger rect =
    ox = (Obj.Left & ~3) + Meta.TriggerLeft*4, oy = (Obj.Top & ~3) + (Meta.TriggerTop*4 - 4),
    w = TriggerWidth*4, h = TriggerHeight*4; value = trap index i (0..127) if effect==ote_TriggeredTrap(4) else 128+effect.
  - Trigger effects: 0 none, 1 exit, 2/3 blocker-forces (internal), 4 triggered trap, 5 water, 6 fire, 7 oneway left, 8 oneway right, 9 steel.
- Object metadata decode: trigger_left*4, trigger_top*4-4, trigger_w*4, trigger_h*4, effect = oTrigger_effect_id.

## Lemming state machine
Per iteration, per lemming (all lemmings every iteration!):
1. If ExplosionTimer>0: Dec; when hits 0: Transition(Exploding) if action in {Vaporizing, Drowning, Floating, Falling} else Transition(Ohnoing); skip rest of this iteration.
2. HandleLemming: animation frame advance (unless Floating or Digging): Frame++, at MaxFrame set EndOfAnimation; if anim type Loop -> Frame=0.
3. Action handler runs; may Transition.
4. If handler returned True: CheckForInteractiveObjects: ObjectBelow = ReadObjectMap(XPos, YPos), ObjectInFront = ReadObjectMap(XPos + 8*xDelta, YPos - 8); dispatch:
   - trap (0..127): if not Triggered: Triggered=True, CurrentFrame=0, RemoveLemming (trap kill), trap sfx.
   - EXIT (129): if action != Falling: Transition(Exiting), yippee. (If Falling: nothing — land first.)
   - FORCELEFT (130): if xDelta>0 TurnAround. FORCERIGHT (131): if xDelta<0 TurnAround.
   - WATER (133): Transition(Drowning). FIRE (134): Transition(Vaporizing).
   - (Note ObjectBelow is used by trap/exit/water/fire; FORCE fields are the blocker arms.)

## Actions
Walking:
- XPos += xDelta (1 or -1). If XPos out of [0..1647] => TurnAround.
- If pixel at feet (XPos, YPos) solid:
  - Step-up loop: dy=0..6: while solid at (XPos, NewY-1) (i.e. pixel 1 above current feet, clipped to -dy-1): dy++, NewY--.
  - If dy>6 (climbed 7+, wall too tall): if IsClimber => Climbing else TurnAround.
  - Else: if dy>=3 => Transition(Jumping), NewY = YPos - 2. YPos = NewY. CheckForLevelTopBoundary.
- Else (no pixel at feet):
  - Slide down: for dy=1..3: YPos++; if solid at (XPos, YPos) break.
  - If none of 3 found ground: YPos++ (4 total), Transition(Falling).
  - If YPos > 163: remove (silent death).
Jumping: while dy<2 and solid at (XPos, YPos-1): dy++, YPos--. If climbed <2 => Walking. (Steps 1-2 px after initial 2.)
Climbing: Frame<=3: if NOT solid at (XPos, YPos-7-Frame) => YPos -= Frame-2, Transition(Hoisting). Else Frame>3: YPos--; if YPos+FrameTopDy < -5 or solid at (XPos - xDelta, YPos-8) at -8 => Transition(Falling, turn: XPos += 2*xDelta).
Hoisting: Frame<=4: YPos -= 2. At EndOfAnimation => Walking. (Animation is 8 frames.)
Falling: if Fallen>16 and IsFloater => Floating. Else scan down: dy=0..2: YPos++, if solid at (XPos, YPos) break (max 3 px/frame, no acceleration). If no ground in 3: Fallen += 3. Else: if Fallen > 60 => Splatting (note: handler returns True => interactive check still runs -> exit-instant-drop bug preserved) else Walking. If YPos > 163: remove (silent death). (Entering Falling sets Fallen=3 - FallerStartsWith3.)
Floating: Frame = FloatTable[i].frame; dy = FloatTable[i].dy; i++ (wrap 16->8). If dy<=0: YPos += dy (rises -1). Else: step down dy px one at a time; if solid at (XPos, YPos) => Walking. FloatTable (16 entries): dy = 3,3,3,3,-1,0,1,1,2,2,2,2,2,2,2,2; frames = 1,2,3,5,5,5,5,5,5,6,7,7,6,5,4,4.
Splatting: EndOfAnimation => RemoveLemming (no rescue count).
Exiting: EndOfAnimation => RemoveLemming, LemmingsSaved++.
Vaporizing: EndOfAnimation => RemoveLemming.
Drowning: if EndOfAnimation => Remove. Else if NOT solid at (XPos + 8*xDelta, YPos) => XPos += xDelta (drift forward while sinking).
Blocking: if NOT solid at (XPos, YPos) => Walking, IsBlocking=False, RestoreMap.
Shrugging: EndOfAnimation => Walking.
Ohnoing: EndOfAnimation => Transition(Exploding). Else slide down like falling (max 3 px/iteration).
Exploding: EndOfAnimation: if IsBlocking: RestoreMap. If DOM at (XPos,YPos) not in {STEEL, WATER}: apply explosion mask (16x22 at XPos-8, YPos-14, clears pixels). RemoveLemming. (Particles optional.)
Digging (frame NOT advanced by HandleLemming — Digger increments its own Frame, wrapping at 16):
- If IsNewDigger: DigOneRow(YPos-2), DigOneRow(YPos-1), IsNewDigger=False. Else Frame = (Frame+1)%16.
- If Frame in {0,8}: YPos++; if YPos>163 remove. DigOneRow(old YPos): if no pixels removed => Falling. Else if DOM at (XPos, YPos) == STEEL: steel sfx, Walking.
- DigOneRow(Y): for x in XPos-4 .. XPos+4 (9 px): if solid: clear pixel.
Bashing (index = Frame % 16):
- index 11..15: XPos += xDelta; if out of bounds => Walking+turn. Else slide down up to 3 (like walking step-down); if 3 steps no ground => Falling. Else FrontObj = ReadObjectMap(XPos + 8*xDelta, YPos - 8); if STEEL or (ONEWAYLEFT && xDelta!=-1) or (ONEWAYRIGHT && xDelta!=1) => steel sfx (steel case) + Walking+turn.
- index 2..5: ApplyBashingMask(frame-2) — 16x10 mask at (XPos + FrameLeftDx, YPos + FrameTopDy) clears terrain. Frame 5: if no solid in 4px ahead at (XPos+8, YPos-6..) => Walking. (Mask frames from main.dat "BashMasks": 4 frames L/R.)
Mining (Frame%16):
- Frame 1: mask 0 at (XPos + frameLeftdx, YPos + frameTopdy). Frame 2: mask 1 at (XPos + xDelta + frameLeftdx, YPos + 1 + frameTopdy).
- Frame 3 or 15: XPos += xDelta twice (turn at bounds each step). Frame 3: YPos++. If not solid at (XPos, YPos) => Falling. BelowObj = DOM at (XPos, YPos); if STEEL or (ONEWAYLEFT && xDelta!=-1) or (ONEWAYRIGHT always — MinerOneWayRightBug!) => Walking+turn.
- Frame 0: YPos++ (if >163 remove).
- (Mining transition itself does YPos++.)
Building (12 bricks; NumberOfBricksLeft=12 on enter):
- Sound warning at Frame==10 && bricks left <=3.
- LayBrick when Frame==9, or (Frame==10 && bricksLeft==9): brick row at (x, YPos-1): x = XPos if facing right else XPos-4; 6 px wide; color = BrickPixelColors[12-bricksLeft] (cycled, alpha terrain); only fills empty pixels. Returns false (frame not advanced? note: returns False -> no interactive check).
- Frame 0: XPos += xDelta, YPos--; if out of bounds or solid at (XPos, YPos-1): Walking+turn. Then XPos += xDelta again; if solid at (XPos, YPos-1): Walking+turn. BricksLeft--; if 0 => Shrugging. If solid at (XPos + 2*xDelta, YPos-9) or out of bounds => Walking+turn. If YPos + FrameTopDy < -5 => Walking (no turn — boundary bug preserved).
- Build mask: on each brick placement? (Lemmix clears via drawing; in DOS, building also erases terrain near the wall — implement: when laying brick, also clear the 4x? area where the builder's body is? Not needed for v1; brick-only matches Lemmix world behavior.)
HitTest/selection: 12x12 rect at (XPos + FrameLeftDx, YPos + FrameTopDy). Prioritized actions (chosen first): Blocking, Building, Shrugging, Bashing, Mining, Digging, Ohnoing.
Skill assignment restrictions:
- Climber: count>0, not already climber, action not in {Blocking, Splatting, Exploding}. (Also not Shrugging-with-bug.) IsClimber flag persists.
- Floater: same, IsFloater flag persists.
- Bomber: count>0, ExplosionTimer==0, action not in {Ohnoing, Exploding, Vaporizing, Splatting}. ExplosionTimer=79 (countdown 5..1 drawn over head at (XPos-1, YPos+FrameTopDy-12), 8x8, 1px off left).
- Blocker: count>0, action in {Walking, Shrugging, Building, Bashing, Mining, Digging}, no overlapping blocker field (DOM in 3x3 grid around (XPos, YPos-2..+2)). Sets 3x3 DOM field: FORCELEFT, BLOCKER, FORCERIGHT rows at y-6,-2,+2; saves old DOM values (9 cells) for RestoreMap.
- Builder: count>0, action in {Walking, Shrugging, Bashing, Mining, Digging}, YPos+FrameTopDy >= -5.
- Basher: count>0, action in {Walking, Shrugging, Building, Mining, Digging}; ObjectInFront not STEEL, not (ONEWAYLEFT && xDelta!=-1), not (ONEWAYRIGHT && xDelta!=1).
- Miner: count>0, same action set; ObjectInFront not STEEL, ObjectBelow not STEEL, one-way checks same as basher.
- Digger: count>0, ObjectBelow not STEEL, action in {Walking, Shrugging, Building, Bashing, Mining}.
Nuke: ExplosionTimer=79 assigned in order released, skipping removed (not splatting/exploding). Game ends when all out and nuked.
Level end: time up, or LemmingsSaved>=max, or LemmingsRemoved>=max, or (nuked && out==0). Success: done = saved*100/available >= rescue*100/available.

## Misc facts
- Explosion mask 16x22 clears pixels (not steel/water DOM).
- Digger removes only terrain pixels (solid check), 9 px per row.
- Basher mask: 16x10, 4 mask frames; Miner mask: 2 frames.
- Countdown digits 8x8: ExplosionTimer 65-79 -> 5, 49-64 -> 4, 33-48 -> 3, 17-32 -> 2, 0-16 -> 1.
- Brick colors: cycle of 12 (BrickPixelColors from main.dat brick graphic, alpha-terrain).
- Fallen is reset to 0 on ANY Transition. Splat threshold: Fallen > 60 (i.e. ~21 freefall iterations => ~64px).
- LEMMING_MIN_X=0, MAX_X=1647, MAX_Y=163, HEAD_MIN_Y=-5 (clamp + turn around if YPos+FrameTopDy < -5; YPos = -7 - dy).
- Walking uses HasPixelAt_ClipY(x, y, minY) = solid at (x,y) if y>=minY else solid at (x,minY).
- The level world buffer is 1584 px wide but x can reach 1647; camera max scroll = -(1584-320).
