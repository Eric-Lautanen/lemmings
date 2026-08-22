// Lemmings web engine - renders and plays levels defined in build/assets.js.
// All game data is extracted 1:1 from the original DOS Lemmings files.
(function () {
  'use strict';

  var A = window.GAME_ASSETS;
  var VIEW_W = 320, VIEW_H = 200, FIELD_H = 160;

  // DOS DAC x4 (verified pixel-exact vs native captures: green 0,176,0 / white
  // 240,208,208 / yellow 176,176,0 / red 240,32,32 / grey 128,128,128 / blue 64,64,224)
  var FIXED_RGB = [
    [0, 0, 0], [64, 64, 224], [0, 176, 0], [240, 208, 208],
    [176, 176, 0], [240, 32, 32], [128, 128, 128]
  ];

  // ---------- decoders ----------
  function b64d(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) { for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } } return px; }
  function unpack1(d, w, h) { var px = new Uint8Array(w * h); var rb = (w + 7) >> 3; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) px[y * w + x] = (d[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1; return px; }
  function unpackPlane(d, w, h, bpp) { var px = new Uint8Array(w * h); var rb = (w + 7) >> 3; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var v = 0; for (var p = 0; p < bpp; p++) if (d[p * rb * h + y * rb + (x >> 3)] & (0x80 >> (x & 7))) v |= 1 << p; px[y * w + x] = v; } return px; }

  // palette: 0-6 fixed, idx 7 = custom[0] dup, idx 8-15 = custom[0..7] (per original)
  function levelPalette(custom) {
    var p = FIXED_RGB.slice();
    p.push(custom[0]);
    for (var i = 0; i < 8; i++) p.push(custom[i]);
    return p;
  }

  // ---------- sprite caches ----------
  var gfxCache = [];
  function gfxSet(g) {
    if (gfxCache[g]) return gfxCache[g];
    var G = A.gfx[g];
    var cache = { pal: levelPalette(G.pc), terrains: [], objects: [], triggers: [] };
    for (var i = 0; i < G.terrains.length; i++) {
      var t = G.terrains[i];
      cache.terrains.push(t ? { w: t.w, h: t.h, px: unpack4(b64d(t.d), t.w, t.h) } : null);
    }
    for (var j = 0; j < G.objects.length; j++) {
      var o = G.objects[j];
      if (!o) { cache.objects.push(null); continue; }
      var all = [];
      for (var ff = 0; ff < o.f.length; ff++)
        all.push({ img: unpack4(b64d(o.f[ff][0]), o.w, o.h), mask: unpack1(b64d(o.f[ff][1]), o.w, o.h) });
cache.objects.push({ w: o.w, h: o.h, img: all[o.s].img, mask: all[o.s].mask,
                     frames: o.n, start: o.s, a: o.a, snd: o.snd, anim: (o.a & 1), all: all });
    }
    for (var k = 0; k < G.triggers.length; k++) cache.triggers.push(G.triggers[k]);
    gfxCache[g] = cache;
    return cache;
  }

  var animCache = {};
  function animData(name) {
    if (animCache[name]) return animCache[name];
    var a = A.main.anims[name]; if (!a) return null;
    var frames = [];
    for (var i = 0; i < a.f.length; i++) frames.push(unpackPlane(b64d(a.f[i]), a.w, a.h, a.bpp));
    animCache[name] = { w: a.w, h: a.h, frames: frames };
    return animCache[name];
  }
  var maskCache = {};
  function maskData(name) {
    if (maskCache[name]) return maskCache[name];
    var m = A.main.masks[name]; if (!m) return null;
    var frames = [];
    for (var i = 0; i < m.f.length; i++) frames.push(unpack1(b64d(m.f[i]), m.w, m.h));
    maskCache[name] = { w: m.w, h: m.h, frames: frames };
    return maskCache[name];
  }
  var hudCache = null;
  function hudDigits() {
    if (!hudCache) { hudCache = []; for (var i = 0; i < A.main.hud.length; i++) hudCache.push(unpack1(b64d(A.main.hud[i]), 8, 8)); }
    return hudCache;
  }
  var cntCellCache = null;
  // bomber countdown digits 5..1 (main.dat sec1 @ 0x154)
  var cdCache = null;
  function countdownDigits() {
    if (!cdCache) { cdCache = []; for (var i = 0; i < A.main.countdown.length; i++) cdCache.push(unpack1(b64d(A.main.countdown[i]), 8, 8)); }
    return cdCache;
  }

  // DOS status font: 8x16, 3bpp planar, chars % 0-9 - A-Z (main.dat sec 6)
  var statCache = null;
  function statFont() {
    if (!statCache) {
      statCache = {};
      for (var k in A.main.font) {
        if (!A.main.font.hasOwnProperty(k)) continue;
        statCache[k] = unpackPlane(b64d(A.main.font[k]), 8, 16, 3);
      }
    }
    return statCache;
  }

  var WALK = { 'walk_r': 8, 'walk_l': 8 };
  var SKILLS = ['climber', 'floater', 'bomber', 'blocker', 'builder', 'basher', 'miner', 'digger'];

  // DOS animation anchors (Lemmix Styles.Base: FootX/FootY per animation).
  // Sprite box = (XPos - FootX, YPos - FootY); web y = DOS YPos - 1.
  var ANIM_FOOT = {
    walk_r: [8, 10], walk_l: [8, 10], jump_r: [8, 10], jump_l: [8, 10],
    dig: [8, 12], climb_r: [8, 12], climb_l: [8, 12], drown: [8, 10],
    postclimb_r: [8, 12], postclimb_l: [8, 12], build_r: [8, 13], build_l: [8, 13],
    bash_r: [8, 10], bash_l: [8, 10], mine_r: [8, 13], mine_l: [8, 13],
    fall_r: [8, 10], fall_l: [8, 10], umbrella_r: [8, 16], umbrella_l: [8, 16],
    splat: [8, 10], exit: [8, 13], fried: [8, 14], block: [8, 10],
    shrug_r: [8, 10], shrug_l: [8, 10], ohno: [8, 10], explode: [16, 25]
  };
  function animFoot(name) { return ANIM_FOOT[name] || [8, 10]; }

  // ---------- level state ----------
  function loadLevel(idx, me) {
    if (!me) me = A.menu[idx];               // 120-slot DOS menu entry
    var lv = A.levels[me.section];           // underlying 80-section geometry
    var W = 1600, H = FIELD_H;
    var g = gfxSet(lv.gfxset);
    var solid = new Uint8Array(W * H);       // 1 = terrain solid
    var color = new Uint8Array(W * H);       // palette index (0 = black)
    var steel = new Uint8Array(W * H);
    var objMap = [];                         // {x,y,w,h,id,effect,dead}

    // terrain: [x, mods, y, tid]; mods bits (Lemmix tdf_, verified vs DOS
    // captures): 1 = erase, 2 = invert (flip vertical), 4 = no-overwrite
    for (var j = 0; j < lv.terrain.length; j++) {
      var te = lv.terrain[j];
      var tid = te[3], ty = Math.round(te[2]);
      var tile = g.terrains[tid];
      if (!tile) continue;
      var tw = tile.w, th = tile.h;
      var erase = te[1] & 1, flip = te[1] & 2, noow = te[1] & 4;
      for (var yy = 0; yy < th; yy++) {
        var ly = ty + yy;
        if (ly < 0 || ly >= H) continue;
        var sy = flip ? th - 1 - yy : yy;
        for (var xx = 0; xx < tw; xx++) {
          var lx = te[0] + xx;
          if (lx < 0 || lx >= W) continue;
          var v = tile.px[sy * tw + xx];
          if (!v) continue;
          var id = ly * W + lx;
          if (erase) { color[id] = 0; solid[id] = 0; }
          else if (noow && solid[id]) continue;
          else { color[id] = v; solid[id] = 1; }
        }
      }
    }
    // steam areas + DOS object map (steel → DOM_STEEL)
    var dom = new Uint8Array(DOMW * DOMH); dom.fill(DOM_NONE);
    var putDom = function (x, y, v) { var i = domIdx({ dom: dom }, x, y); if (i >= 0) dom[i] = v; };
    if (lv.steel) {
      for (var s = 0; s < lv.steel.length; s++) {
        var st = lv.steel[s];
        for (var sy2 = st[1]; sy2 < st[1] + st[3] && sy2 < H; sy2++)
          for (var sx2 = st[0]; sx2 < st[0] + st[2] && sx2 < W; sx2++) {
            steel[sy2 * W + sx2] = 1;
            putDom(sx2, sy2, DOM_STEEL);
          }
      }
    }
    // objects: static ones are baked into the world bitmap in DOS draw order
    // (only-on-terrain pieces first, then the rest - Lemmix RenderWorld);
    // animated types (1 triggered, 2 continuous, 3 once/entrance) render per frame
    for (var pass = 2; pass >= 1; pass--) {
      for (var k = 0; k < lv.objs.length; k++) {
        var o = lv.objs[k], ox = o[0], oy = o[1], oid = o[2], mods = o[3], disp = o[4];
        var ob = g.objects[oid];
        if (!ob) { if (pass === 2) objMap.push({ x: ox, y: oy, w: 0, h: 0, id: oid, effect: 0, dead: 0 }); continue; }
        var ow = ob.w, oh = ob.h;
        var anim = ob.a;   // groundxo anim_flags: 0 none, 1 triggered, 2 continuous, 3 once
        var mode = (mods & 0x40) ? 2 : ((mods & 0x80) ? 1 : 0);  // OnlyOnTerrain wins (Lemmix order)
        var isOnly = mode === 2;
        if ((pass === 2) !== isOnly) continue;   // pass 2: only-on-terrain, pass 1: rest
        if (!anim) {
          // static objects are baked into the world bitmap
          var img = ob.img, mask = ob.mask;
          for (var yy2 = 0; yy2 < oh; yy2++) {
            var ry2 = disp === 0x8F ? oh - 1 - yy2 : yy2;
            for (var xx2 = 0; xx2 < ow; xx2++) {
              if (!mask[ry2 * ow + xx2]) continue;
              var lx2 = ox + xx2, ly2 = oy + yy2;
              if (lx2 < 0 || lx2 >= W || ly2 < 0 || ly2 >= H) continue;
              var id2 = ly2 * W + lx2;
              var v2 = img[ry2 * ow + xx2];
              if (mode === 1 && solid[id2]) continue;   // no-overwrite: only on empty
              if (mode === 2 && !solid[id2]) continue;  // on-terrain only
              color[id2] = v2;
            }
          }
        }
        var tr = g.triggers[oid];
        // DOS object-map trigger: (Left & ~3) + trig_l*4, (Top & ~3) + (trig_t*4 - 4), w/h *4
        var trx = (ox & ~3) + (tr ? tr[0] * 4 : 0), try2 = (oy & ~3) + (tr ? tr[1] * 4 - 4 : 0);
        var trw = tr ? tr[2] * 4 : ow, trh = tr ? tr[3] * 4 : oh;
        objMap.push({ x: trx, y: try2, w: trw, h: trh,
                      dx: ox, dy: oy, dw: ow, dh: oh, id: oid, effect: tr ? tr[4] : 0, dead: 0,
                      fr: ob.frames, start: ob.start, anim: anim, disp: disp, mods: mods, ob: ob });
      }
    }
    // DOM write: first 16 non-entrance objects only (DOS DisableObjectsAfter15;
    // Lemmix iterates ObjectInfos which excludes entrances); traps (effect 4)
    // store the trap-list index, others 128 + effect
    var traps = [];
    for (var t9 = 0; t9 < objMap.length; t9++) if (objMap[t9].id !== 1) traps.push(objMap[t9]);
    for (var k3 = 0; k3 < traps.length && k3 < 16; k3++) {
      var zo1 = traps[k3];
      var tr1 = g.triggers[zo1.id];
      if (!tr1) continue;
      var dval = tr1[4] === 4 ? k3 : 128 + tr1[4];
      for (var dyy = zo1.y; dyy < zo1.y + zo1.h; dyy++)
        for (var dxx = zo1.x; dxx < zo1.x + zo1.w; dxx++)
          putDom(dxx, dyy, dval);
    }

    // spawn/exit: obj id 1 = entrance, 0 = exit
    var entrances = [], exit = null;
    for (var m = 0; m < objMap.length; m++) {
      if (objMap[m].id === 1) entrances.push(objMap[m]);
      if (objMap[m].id === 0 && !exit) exit = objMap[m];
    }
    // DOS entrance release order (OldEntranceABBAOrder): A B B A / A B C B / A B C D / A A A A
    var order;
    if (entrances.length === 2) order = [0, 1, 1, 0];
    else if (entrances.length === 3) order = [0, 1, 2, 1];
    else if (entrances.length === 4) order = [0, 1, 2, 3];
    else order = [0, 0, 0, 0];

    return {
      idx: idx, name: me.name, gfx: lv.gfxset, W: W, H: H,
      solid: solid, color: color, steel: steel, objs: objMap, dom: dom, traps: traps,
      anims: objMap.filter(function (o2) { return o2.anim; }),
      spawnX: entrances.length ? entrances[0].dx + 24 : 8,
      spawnY: entrances.length ? entrances[0].dy + 13 : 0,
      entrances: entrances, order: order,
      exit: exit, cam: Math.max(0, Math.min(lv.startx, W - VIEW_W)),
      rate: me.rate, lems: me.lems, rescueNeed: me.rescue, timelimit: me.time * 60,
      skills: me.skills.slice(), startx: lv.startx,
      timeLeft: me.time * 60
    };
  }

  // ---------- lemmings ----------
  function makeLem(level, x, y) {
    return {
      x: x, y: y, dir: 1, state: 'walk', frame: 0, tick: 0, stT: 0,
      endOfAnim: false,
      climber: 0, floater: 0, dead: 0, rescued: 0, timer: 0,
      explosionTimer: 0, fallen: 0, floatI: 0, floatFrame: 1,
      bn: 0, bricksLeft: 0, dgFirst: 1, mineN: 0
    };
  }

  // DOS levels sometimes mount the entrance hatch flush against a pillar of
  // solid terrain (e.g. level 0).  The original game lets lemmings fall out of
  // the hatch through that pillar, so carve the shaft below the door at load
  // time (collision only; steel is respected - the render data stays intact).
  function carveShaft(L) {
    var x0 = Math.round(L.spawnX), y0 = Math.round(L.spawnY);
    if (x0 < 0 || x0 + 11 >= L.W) return;
    var y = y0 + 1;
    while (y < L.H && (L.solid[y * L.W + x0 + 4] || L.solid[y * L.W + x0 + 11])) {
      for (var xx = x0; xx <= x0 + 11; xx++) eraseAt(L, xx, y);
      y++;
    }
  }

  function solidAt(L, x, y) {
    if (x < 0 || x >= L.W || y < 0 || y >= L.H) return 0;
    return L.solid[y * L.W + x];
  }
  // ---- DOS object map (DOM): 4px cells, x -16..1647, y -16..175 (DOMADD = 16/4) ----
  var DOMW = 416, DOMH = 48, DOM_NONE = 128, DOM_EXIT = 129, DOM_FORCELEFT = 130,
      DOM_FORCERIGHT = 131, DOM_WATER = 133, DOM_FIRE = 134, DOM_ONEWAYLEFT = 135,
      DOM_ONEWAYRIGHT = 136, DOM_STEEL = 137, DOM_BLOCKER = 138;
  function domIdx(L, x, y) {
    var cx = ((x & ~3) >> 2) + 4, cy = ((y & ~3) >> 2) + 4;
    if (cx < 0 || cx >= DOMW || cy < 0 || cy >= DOMH) return -1;
    return cy * DOMW + cx;
  }
  function domAt(L, x, y) { var i = domIdx(L, x, y); return i < 0 ? DOM_NONE : L.dom[i]; }
  function domSet(L, x, y, v) { var i = domIdx(L, x, y); if (i >= 0) L.dom[i] = v; }
  // DOS blocker: 3x3 field of DOM cells around the blocker
  // (DOS rows YPos-6/-2/+2 = web y-5/-1/+3)
  function setBlockerField(L, lem) {
    lem.domSaved = [];
    for (var by = -5; by <= 3; by += 4)
      for (var bx = -4; bx <= 4; bx += 4) {
        var cx = Math.round(lem.x + bx), cy = Math.round(lem.y + by);
        lem.domSaved.push(domAt(L, cx, cy));
        domSet(L, cx, cy, bx < 0 ? DOM_FORCELEFT : bx > 0 ? DOM_FORCERIGHT : DOM_BLOCKER);
      }
  }
  function clearBlockerField(L, lem) {
    if (!lem.domSaved) return;
    var i = 0;
    for (var by = -5; by <= 3; by += 4)
      for (var bx = -4; bx <= 4; bx += 4) {
        domSet(L, Math.round(lem.x + bx), Math.round(lem.y + by), lem.domSaved[i++]);
      }
    lem.domSaved = null;
  }
  // returns 7 (one-way left) / 8 (one-way right) when (x,y) lies in a one-way DOM cell, else 0
  function oneWayAt(L, x, y) {
    var v = domAt(L, x, y);
    if (v === DOM_ONEWAYLEFT) return 7;
    if (v === DOM_ONEWAYRIGHT) return 8;
    return 0;
  }
  function eraseAt(L, x, y) {
    if (x < 0 || x >= L.W || y < 0 || y >= L.H) return;
    var id = y * L.W + x;
    if (L.steel[id]) return;
    if (L.solid[id]) { L.solid[id] = 0; L.color[id] = 0; L.worldDirty = true; }
  }
  function applyMask(L, mask, w, h, x, y, fliph) {
    var changed = false;
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var m = fliph ? (w - 1 - xx) : xx;
      if (mask[yy * w + m]) { eraseAt(L, x + xx, y + yy); changed = true; }
    }
    if (changed) L.worldDirty = true;
  }
  function spriteFrame(L, lem) {
    var name = lem.state;
    if (lem.state === 'walk') name = lem.dir > 0 ? 'walk_r' : 'walk_l';
    if (lem.state === 'jump') name = lem.dir > 0 ? 'jump_r' : 'jump_l';
    if (lem.state === 'fall') name = lem.dir > 0 ? 'fall_r' : 'fall_l';
    if (lem.state === 'float') {
      // DOS floater: frame index comes from FloatParametersTable (set in updateLem)
      var fa = animData(lem.dir > 0 ? 'umbrella_r' : 'umbrella_l');
      if (!fa) return null;
      return { a: fa, f: Math.min(lem.floatFrame, fa.frames.length - 1) };
    }
    if (lem.state === 'climb') name = lem.dir > 0 ? 'climb_r' : 'climb_l';
    if (lem.state === 'block') name = 'block';
    if (lem.state === 'shrug') name = lem.dir > 0 ? 'shrug_r' : 'shrug_l';  // DOS Shrugging anim
    if (lem.state === 'ohno') name = 'ohno';
    if (lem.state === 'hoist') name = lem.dir > 0 ? 'postclimb_r' : 'postclimb_l';
    if (lem.state === 'splat') name = 'splat';
    if (lem.state === 'build') name = lem.dir > 0 ? 'build_r' : 'build_l';
    if (lem.state === 'bash') name = lem.dir > 0 ? 'bash_r' : 'bash_l';
    if (lem.state === 'mine') name = lem.dir > 0 ? 'mine_r' : 'mine_l';
    if (lem.state === 'dig') name = 'dig';
    if (lem.state === 'exit') name = 'exit';
    if (lem.state === 'drown') name = 'drown';
    if (lem.state === 'vapor') name = 'fried';
    var a = animData(name);
    if (!a) return null;
    a.foot = animFoot(name);
    // Frame is advanced centrally by updateLem (DOS HandleLemming); floaters
    // get theirs from FloatParametersTable and are handled above.
    var f = lem.frame % Math.max(1, a.frames.length);
    if (f >= a.frames.length) f = a.frames.length - 1;
    return { a: a, f: f };
  }

  function lemBounds(lem) {
    var a = animData('walk_r');
    var w = a ? a.w : 16, h = a ? a.h : 16;
    if (lem.state === 'bash' || lem.state === 'dig' || lem.state === 'build') {
      var other = animData(lem.dir > 0 ? 'bash_r' : 'bash_l') || animData('dig');
      w = other.w; h = other.h;
    }
    return { w: w, h: h };
  }

  // ---------- physics ----------
  // DOS FloatParametersTable (Game.pas): dy + animation frame per iteration;
  // index wraps from 15 back to 8 (the last 8 entries loop forever)
  var FLOAT_DY = [3, 3, 3, 3, -1, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2];
  var FLOAT_FRAME = [1, 2, 3, 5, 5, 5, 5, 5, 5, 6, 7, 7, 6, 5, 4, 4];
  var MAX_FALLDISTANCE = 60;   // splat when Fallen > 60
  var HEAD_MIN_Y = -5, LEMMING_MAX_Y = 163, LEMMING_MAX_X = 1640;

  // Per-action animation metadata: [frameCount, loops] (Lemmix Styles.Base).
  // Frame advances centrally every iteration (DOS HandleLemming) except for
  // Floating and Digging, which manage their own frames.
  var ACTION_ANIM = {
    walk: [8, true], jump: [1, false], climb: [8, true], drown: [16, false],
    hoist: [8, false], build: [16, true], bash: [32, true], mine: [24, true],
    fall: [4, true], splat: [16, false], exit: [8, false], vapor: [14, false],
    block: [16, true], shrug: [8, false], ohno: [16, false], explode: [1, false]
  };

  function setAction(lem, s) {
    lem.state = s;
    lem.frame = 0;
    lem.endOfAnim = false;
    lem.stT = lem.tick;
  }

  function updateLem(L, lem) {
    if (lem.dead || lem.rescued) return;
    lem.tick++;
    // ---- ExplosionTimer ticks in ANY action (DOS UpdateExplosionTimer) ----
    if (lem.explosionTimer > 0) {
      lem.explosionTimer--;
      if (lem.explosionTimer === 0) {
        if (lem.state === 'fall' || lem.state === 'float' || lem.state === 'drown' || lem.state === 'vapor') {
          setAction(lem, 'explode');   // Exploding cues its own sfx
        } else {
          setAction(lem, 'ohno');
          if (!state.nuked) sfx(5);    // SFX_OHNO only for assigned bombers
        }
        return;                                        // skip the rest of this iteration
      }
      // DOS still runs the action handler below after a non-zero countdown
    }
    // ---- central animation frame advance (DOS HandleLemming) ----
    var ainfo = ACTION_ANIM[lem.state];
    lem.endOfAnim = false;
    if (ainfo && lem.state !== 'float' && lem.state !== 'dig') {
      if (lem.frame < ainfo[0] - 1) {
        lem.frame++;
      } else {
        lem.endOfAnim = true;
        if (ainfo[1]) lem.frame = 0;
      }
    }
    var feet = lem.y;
    var aheadX = Math.round(lem.x + (lem.dir > 0 ? 15 : -1));

    if (lem.state === 'walk') {
      // DOS HandleWalking: advance first, then probe the anchor column
      lem.x += lem.dir;
      if (lem.x < 0 || lem.x > LEMMING_MAX_X) { lem.dir = -lem.dir; return; }
      var cx = Math.round(lem.x), cy = Math.round(lem.y);
      if (solidAt(L, cx, cy + 1)) {
        // step-up loop: count solid pixels above the feet, max 7
        var d = 0;
        while (d <= 6 && solidAt(L, cx, cy - d)) d++;
        if (d > 6) {
          if (lem.climber) { setAction(lem, 'climb'); return; }
          lem.dir = -lem.dir; return;
        }
        if (d >= 3) { lem.y -= 2; setAction(lem, 'jump'); return; }   // Transition(Jumping)
        lem.y -= d;                            // stand on top of the step
        return;
      }
      // no ground at the feet: slide down up to 3 px looking for it
      var grounded = false;
      for (var sl = 0; sl < 3; sl++) {
        lem.y += 1;
        if (solidAt(L, cx, Math.round(lem.y) + 1)) { grounded = true; break; }
      }
      if (!grounded) {
        lem.y += 1;          // one more pixel down, then fall
        startFall(lem);
        if (lem.y > LEMMING_MAX_Y) lem.dead = 1;
        return;
      }
      return;
    }
    if (lem.state === 'fall') {
      // DOS HandleFalling: constant scan-down of up to 3 px per iteration,
      // no acceleration.  Fallen starts at 3 (FallerStartsWith3) and grows by
      // 3 per free-fall iteration; > 60 on landing => splat.
      if (lem.floater && lem.fallen > 16) { startFloat(lem); return; }
      var cx9 = Math.round(lem.x);
      var landed = false;
      for (var fstep = 0; fstep < 3; fstep++) {
        if (solidAt(L, cx9, Math.round(lem.y) + 1)) { landed = true; break; }
        lem.y += 1;
      }
      if (!landed) {
        lem.fallen += 3;
        if (lem.y > LEMMING_MAX_Y) { lem.dead = 1; }   // silent death
        return;
      }
      if (lem.fallen > MAX_FALLDISTANCE) {
        setAction(lem, 'splat'); sfx(8);
        return;   // handler "returns True": the interactive check still runs (SplattingExitsBug)
      }
      toWalk(lem);
      return;
    }
    if (lem.state === 'float') {
      // DOS HandleFloating: table-driven dy + frame index, wrap 16 -> 8
      var fi = lem.floatI;
      lem.floatFrame = FLOAT_FRAME[fi];
      var fdy = FLOAT_DY[fi];
      lem.floatI = (fi >= 15) ? 8 : fi + 1;
      if (fdy <= 0) {
        lem.y += fdy;
      } else {
        for (var fd = 0; fd < fdy; fd++) {
          if (solidAt(L, Math.round(lem.x), Math.round(lem.y) + 1)) { toWalk(lem); return; }
          lem.y += 1;
        }
      }
      if (lem.y > LEMMING_MAX_Y) { lem.dead = 1; }
      return;
    }
    if (lem.state === 'jump') {
      // DOS HandleJumping: rises up to 2 more px while the way up is solid,
      // then walks.  (Entered from Walking on 3..6px steps.)
      var jr = 0;
      while (jr < 2 && solidAt(L, Math.round(lem.x), Math.round(lem.y))) { lem.y--; jr++; }
      if (jr < 2) toWalk(lem);
      return;
    }
    if (lem.state === 'climb') {
      // DOS HandleClimbing: 8-frame cycle; frames 0..3 look for the top and
      // hoist over it; frames 4..7 rise 1px and fall back on overhangs
      var ci = lem.frame % 8;
      var wallX = Math.round(lem.x);
      if (ci <= 3) {
        if (!solidAt(L, wallX, Math.round(lem.y) - 6 - ci)) {
          lem.y = Math.round(lem.y) - ci + 2;
          setAction(lem, 'hoist');
          return;
        }
      } else {
        lem.y--;
        if (solidAt(L, wallX - lem.dir, Math.round(lem.y) - 7) || Math.round(lem.y) < 6) {
          // overhang above the climb (or head above the top of the world): fall back
          startFall(lem);
          lem.dir = -lem.dir; lem.x += lem.dir * 2;
          return;
        }
      }
      return;
    }
    if (lem.state === 'hoist') {
      // DOS HandleHoisting: rises 2px while Frame <= 4 (handler sees 1..4),
      // walks at EndOfAnimation
      if (!lem.endOfAnim && lem.frame >= 1 && lem.frame <= 4) lem.y -= 2;
      if (lem.endOfAnim) { toWalk(lem); }
      return;
    }
    if (lem.state === 'block') {
      // DOS HandleBlocking: walks away when the ground under the blocker is removed
      if (!solidAt(L, Math.round(lem.x), Math.round(lem.y) + 1)) {
        clearBlockerField(L, lem);
        toWalk(lem);
      }
      return;
    }
    if (lem.state === 'ohno') {
      // DOS HandleOhNoing: EndOfAnimation -> Exploding; otherwise slides down
      // up to 3px/iteration while airborne
      if (lem.endOfAnim) {
        clearBlockerField(L, lem);
        setAction(lem, 'explode'); sfx(12);
        return;
      }
      for (var os = 0; os < 3; os++) {
        if (solidAt(L, Math.round(lem.x), Math.round(lem.y) + 1)) break;
        lem.y++;
      }
      if (lem.y > LEMMING_MAX_Y) { lem.dead = 1; return; }
      return;
    }
    if (lem.state === 'explode') {
      // DOS Exploding: 1-frame anim; EndOfAnimation applies the blast unless
      // standing in steel or water, then removes the lemming
      if (lem.endOfAnim) {
        var dv9 = domAt(L, Math.round(lem.x), Math.round(lem.y) + 1);
        if (dv9 !== DOM_STEEL && dv9 !== DOM_WATER) explodeAt(L, lem.x, lem.y);
        lem.dead = 1;
      }
      return;
    }
    if (lem.state === 'splat') {
      if (lem.endOfAnim) lem.dead = 1;
      return;
    }
    if (lem.state === 'exit') {
      // DOS HandleExiting: animates in place (no drift), then removed + counted
      if (lem.endOfAnim) lem.rescued = 1;
      return;
    }
    if (lem.state === 'drown') {
      // DOS HandleDrowning: EndOfAnimation removes; otherwise drifts forward
      // while the pixel 8px ahead is free
      if (lem.endOfAnim) { lem.dead = 1; return; }
      if (!solidAt(L, Math.round(lem.x + lem.dir * 8), Math.round(lem.y))) lem.x += lem.dir;
      return;
    }
    if (lem.state === 'vapor') {
      if (lem.endOfAnim) lem.dead = 1;
      return;
    }
    if (lem.state === 'build') {
      buildStep(L, lem);
      return;
    }
    if (lem.state === 'shrug') {
      if (lem.endOfAnim) toWalk(lem);
      return;
    }
    if (lem.state === 'bash') {
      bashStep(L, lem);
      return;
    }
    if (lem.state === 'mine') {
      mineStep(L, lem);
      return;
    }
    if (lem.state === 'dig') {
      digStep(L, lem);
      return;
    }
  }

  function toWalk(lem) { lem.state = 'walk'; lem.frame = 0; lem.endOfAnim = false; lem.stT = lem.tick; lem.fallen = 0; }
  function startFall(lem) { setAction(lem, 'fall'); lem.fallen = 3; }   // FallerStartsWith3
  function startFloat(lem) { setAction(lem, 'float'); lem.floatI = 0; lem.floatFrame = FLOAT_FRAME[0]; lem.fallen = 0; }

  // DOS HandleBuilding: 16-frame cycle driven by the generic frame advance.
  // Frame 0 advances 2px with wall checks and rises 1px; frame 9 (or 10 when
  // exactly 9 bricks are left - DOS quirk) lays a 6px brick on the row above
  // the feet; 12 bricks then shrug.  Warning sound at frame 10 with <= 3 left.
  function buildStep(L, lem) {
    var bc = lem.frame % 16;   // frame advanced centrally (16-frame Loop anim)
    if (bc === 10 && lem.bricksLeft <= 3) sfx(18);  // DOS builder warning (last 3 bricks)
    if (bc === 9 || (bc === 10 && lem.bricksLeft === 9)) {
      layBrick(L, lem);
      return;
    }
    if (bc === 0) {
      lem.x += lem.dir;
      lem.y--;                                   // DOS rises before the wall checks
      if (lem.x < 0 || lem.x > LEMMING_MAX_X || solidAt(L, Math.round(lem.x), Math.round(lem.y))) {
        toWalk(lem); lem.dir = -lem.dir; return;
      }
      lem.x += lem.dir;
      if (lem.x < 0 || lem.x > LEMMING_MAX_X || solidAt(L, Math.round(lem.x), Math.round(lem.y))) {
        toWalk(lem); lem.dir = -lem.dir; return;
      }
      lem.bricksLeft--;
      if (lem.bricksLeft <= 0) { setAction(lem, 'shrug'); return; }
      if (solidAt(L, Math.round(lem.x + lem.dir * 2), Math.round(lem.y) - 8) ||
          lem.x < 0 || lem.x > LEMMING_MAX_X) {
        toWalk(lem); lem.dir = -lem.dir; return;
      }
      if (Math.round(lem.y) < 7) { toWalk(lem); return; }  // too high: walk (no turn)
    }
  }

  // DOS LayBrick: single row at YPos-1 (= web row y), 6 px starting at XPos
  // (right-facing) or XPos-4 (left-facing); fills empty pixels only; color =
  // brick color (= palette entry 7, the graphic set's first custom color)
  function layBrick(L, lem) {
    var x0 = lem.dir === 1 ? Math.round(lem.x) : Math.round(lem.x) - 4;
    var row = Math.round(lem.y);
    if (row < 0 || row >= L.H) return;
    for (var bi = 0; bi < 6; bi++) {
      var pxX = x0 + bi;
      if (pxX < 0 || pxX >= L.W) continue;
      var id = row * L.W + pxX;
      if (!L.solid[id]) { L.solid[id] = 1; L.color[id] = 7; L.worldDirty = true; }
    }
  }

  // DOS HandleBashing: index = Frame % 16; frames 2..5 swing the mask
  // (16x10 box at (XPos-8, YPos-10), pre-mirrored art per direction),
  // frames 11..15 advance.  Steel/one-way ahead turns the basher around.
  function bashStep(L, lem) {
    var bi = lem.frame % 16;   // frame advanced centrally (32-frame Loop anim)
    if (bi >= 2 && bi <= 5) {
      if (bi === 5) spkBash(); // DOS plays tool sounds on the PC speaker
      var m = maskData(lem.dir > 0 ? 'bash_mask_r' : 'bash_mask_l');
      if (m) applyMask(L, m.frames[bi - 2], m.w, m.h,
                       Math.round(lem.x) - 8, Math.round(lem.y) - 9, false);
      if (lem.frame === 5) {
        // tunnel finished check (first cycle only, raw frame 5): nothing solid
        // in the 4px strip ahead at body height
        var gw = 0;
        while (gw < 4 && !solidAt(L, Math.round(lem.x + lem.dir * 8 + gw * lem.dir), Math.round(lem.y) - 5)) gw++;
        if (gw === 4) { toWalk(lem); return; }
      }
    }
    if (bi >= 11 && bi <= 15) {
      lem.x += lem.dir;
      if (lem.x < 0 || lem.x > LEMMING_MAX_X) { toWalk(lem); lem.dir = -lem.dir; return; }
      // DOS: check the anchor pixel BEFORE moving - slide down up to 3px only
      // while the ground under the basher is gone (a move-first order here
      // made the basher sink through its own tunnel floor)
      var bx = Math.round(lem.x);
      var dyb = 0;
      while (dyb < 3 && !solidAt(L, bx, Math.round(lem.y) + 1)) { dyb++; lem.y++; }
      if (dyb === 3) { startFall(lem); return; }
      // steel or one-way wall ahead: walk + turn (DOS: ReadObjectMap at (x+8*dir, y-8))
      var fv = domAt(L, Math.round(lem.x + lem.dir * 8), Math.round(lem.y) - 7);
      if (fv === DOM_STEEL || (fv === DOM_ONEWAYLEFT && lem.dir !== -1) || (fv === DOM_ONEWAYRIGHT && lem.dir !== 1)) {
        if (fv === DOM_STEEL) sfx(10);
        toWalk(lem); lem.dir = -lem.dir; return;
      }
    }
  }

  // DOS HandleMining: 24-frame cycle.  Transition into mining sinks 1px.
  // Frame 0 sinks 1px; frames 1-2 apply the two mask chips (frame 2 cues the
  // miner sound); frames 3 and 15 advance 2px (with bounds turns); frame 3
  // also sinks 1px, falls when airborne and turns on steel / one-way walls
  // below (including the original one-way-right bug: unminable either way).
  function mineStep(L, lem) {
    var mi = lem.frame;   // frame advanced centrally (24-frame Loop anim)
    if (mi === 1 || mi === 2) {
      var m2 = maskData(lem.dir > 0 ? 'mine_mask_r' : 'mine_mask_l');
      // DOS mask boxes: frame 1 at (XPos-8, YPos-13), frame 2 shifted
      // (+xDelta, +1); web coords = (x-8, y-12) / (x+dir-8, y-11)
      if (m2) applyMask(L, m2.frames[mi - 1], m2.w, m2.h,
                        Math.round(lem.x) - 8 + (mi === 2 ? lem.dir : 0),
                        Math.round(lem.y) - 12 + (mi === 2 ? 1 : 0), false);
      if (mi === 2) spkMine();
    } else if (mi === 3 || mi === 15) {
      lem.x += lem.dir;
      if (lem.x < 0 || lem.x > LEMMING_MAX_X) { toWalk(lem); lem.dir = -lem.dir; return; }
      lem.x += lem.dir;
      if (lem.x < 0 || lem.x > LEMMING_MAX_X) { toWalk(lem); lem.dir = -lem.dir; return; }
      if (mi === 3) {
        lem.y++;
        if (lem.y > LEMMING_MAX_Y) { lem.dead = 1; return; }
      }
      if (!solidAt(L, Math.round(lem.x), Math.round(lem.y) + 1)) {
        startFall(lem); return;
      }
      var bv = domAt(L, Math.round(lem.x), Math.round(lem.y) + 1);
      if (bv === DOM_STEEL || (bv === DOM_ONEWAYLEFT && lem.dir !== -1) || bv === DOM_ONEWAYRIGHT) {
        if (bv === DOM_STEEL) sfx(10);
        toWalk(lem); lem.dir = -lem.dir; return;
      }
    } else if (mi === 0) {
      lem.y++;
      if (lem.y > LEMMING_MAX_Y) lem.dead = 1;
    }
  }

  // DOS HandleDigging: new digger digs rows YPos-2/YPos-1 once, then manages
  // its own 16-frame cycle (excluded from the central advance): at frames 0/8
  // descend 1px and dig the previous feet row; no terrain in the row -> fall;
  // DOM steel below -> walk
  function digStep(L, lem) {
    if (lem.dgFirst) {
      lem.dgFirst = 0;
      if (digRow(L, lem, Math.round(lem.y) - 1)) spkDig();
      if (digRow(L, lem, Math.round(lem.y))) spkDig();
    } else {
      lem.frame = (lem.frame + 1) % 16;   // Digger increments its own Frame
      if (lem.frame === 0 || lem.frame === 8) {
        // DOS digs its old feet row (DOS YPos = web y+1)
        var drow = Math.round(lem.y) + 1;
        lem.y++;
        if (lem.y > LEMMING_MAX_Y) { lem.dead = 1; return; }
        if (!digRow(L, lem, drow)) { startFall(lem); return; }
        else spkDig();
        if (domAt(L, Math.round(lem.x), Math.round(lem.y) + 1) === DOM_STEEL) { toWalk(lem); return; }
      }
    }
  }

  // DOS ExplodeLem: 16x22 blast drawn at (XPos-8, YPos-14)
  function explodeAt(L, x, y) {
    var m = maskData('explode_mask');
    if (m) applyMask(L, m.frames[0], m.w, m.h, Math.round(x) - 8, Math.round(y) - 13);
  }
  // DOS DigOneRow: 9px-wide row centered on the lem's x (x-4..x+4); returns true if any pixel was removed
  function digRow(L, lem, y) {
    if (y < 0 || y >= L.H) return false;
    var removed = 0;
    for (var dxi = -4; dxi <= 4; dxi++) {
      var dpx = Math.round(lem.x) + dxi;
      if (dpx < 0 || dpx >= L.W) continue;
      if (L.solid[y * L.W + dpx]) { L.solid[y * L.W + dpx] = 0; L.color[y * L.W + dpx] = 0; removed++; }
    }
    if (removed) L.worldDirty = true;
    return removed > 0;
  }

    // DOS assignment rules (AssignClimber/Floater/Bomber/Blocker/Builder/Basher/Miner/Digger)
  function groundState(lem) {
    var s = lem.state;
    return s === 'walk' || s === 'shrug' || s === 'build' || s === 'bash' || s === 'mine' || s === 'dig';
  }
  function assignSkill(L, lem, skill) {
    if (L.skills[skill] <= 0) return false;
    switch (SKILLS[skill]) {
      case 'climber':
        // any action except blocking/splatting/exploding
        if (lem.climber || lem.state === 'block' || lem.state === 'splat' || lem.state === 'explode') return false;
        lem.climber = 1;
        // AssignClimberShruggerActionBug: assigning while shrugging forces Walking
        if (lem.state === 'shrug') toWalk(lem);
        break;
      case 'floater':
        if (lem.floater || lem.state === 'block' || lem.state === 'splat' || lem.state === 'explode') return false;
        lem.floater = 1;
        if (lem.state === 'fall') startFloat(lem);
        break;
      case 'bomber':
        // DOS AssignBomber: keeps the current action; only the fuse is set
        if (lem.explosionTimer > 0 || lem.state === 'ohno' || lem.state === 'explode' ||
            lem.state === 'vapor' || lem.state === 'splat') return false;
        lem.explosionTimer = 79; break;
      case 'blocker':
        // DOS: walking/shrugging/building/bashing/mining/digging + no overlapping field
        if (!groundState(lem)) return false;
        for (var by2 = -5; by2 <= 3; by2 += 4) for (var bx2 = -4; bx2 <= 4; bx2 += 4) {
          var bv = domAt(L, Math.round(lem.x + bx2), Math.round(lem.y + by2));
          if (bv === DOM_BLOCKER || bv === DOM_FORCELEFT || bv === DOM_FORCERIGHT) return false;
        }
        setBlockerField(L, lem);
        setAction(lem, 'block'); break;
      case 'builder':
        // DOS: walking/shrugging/bashing/mining/digging (NOT building); head below the top
        if (!groundState(lem) || lem.state === 'build' || Math.round(lem.y) < 7) return false;
        setAction(lem, 'build'); lem.bricksLeft = 12; break;
      case 'basher':
        // DOS: any ground state except bashing; deny on front steel or wrong-way one-way
        if (!groundState(lem) || lem.state === 'bash') return false;
        if (domAt(L, Math.round(lem.x + lem.dir * 8), Math.round(lem.y) - 7) === DOM_STEEL) { sfx(10); return false; }
        var ow1 = oneWayAt(L, Math.round(lem.x + lem.dir * 8), Math.round(lem.y) - 7);
        if ((ow1 === 7 && lem.dir !== -1) || (ow1 === 8 && lem.dir !== 1)) return false;
        setAction(lem, 'bash'); break;
      case 'miner':
        // DOS: any ground state except mining; deny on front/below steel or
        // wrong-way one-way IN FRONT (Lemmix checks ObjectInFront for one-ways)
        if (!groundState(lem) || lem.state === 'mine') return false;
        var fx9 = Math.round(lem.x + lem.dir * 8), fy9 = Math.round(lem.y) - 7;
        if (domAt(L, fx9, fy9) === DOM_STEEL) { sfx(10); return false; }
        if (domAt(L, Math.round(lem.x), Math.round(lem.y) + 1) === DOM_STEEL) { sfx(10); return false; }
        var ow2 = oneWayAt(L, fx9, fy9);
        if ((ow2 === 7 && lem.dir !== -1) || (ow2 === 8 && lem.dir !== 1)) return false;
        setAction(lem, 'mine'); lem.y++; break;   // transition sinks 1px
      case 'digger':
        // DOS: any ground state except digging; deny on steel below
        if (!groundState(lem) || lem.state === 'dig') return false;
        if (domAt(L, Math.round(lem.x), Math.round(lem.y) + 1) === DOM_STEEL) { sfx(10); return false; }
        setAction(lem, 'dig'); lem.dgFirst = 1; break;
    }
    L.skills[skill]--;
    sfx(4);
    return true;
  }
  // DOS BtnNuke + CheckUpdateNuking: nuking stops releases; then one lemming
  // per iteration, in release order and skipping removed ones, gets a fuse of
  // 79 (splatted/exploding lemmings are skipped without consuming the pass)
  function nukeAll(L) {
    if (state.nuked) return;
    state.nuked = true;
    state.nukeIdx = 0;
    spkNuke();
  }

  // ---------- global sim ----------
  var state = {
    level: null, lems: [], pending: 0, released: 0, rescued: 0, selSkill: -1,
    timeLeft: 0, cam: 0, releaseT: 0, paused: false, fast: false, over: null,
    msgT: 0, rate: 50, mx: 160, my: 300, mouseOn: false, acc: 0, last: 0, tick: 0,
    nuked: false, nukeIdx: -1
  };

  // ---------- AdLib audio (guarded: absent in headless/build tests) ----------
  var audio = (typeof window !== 'undefined' && window.ADLIB) ? new window.ADLIB.AdlibAudio() : null;
  function sfx(n) { if (audio) audio.playSfx(n); }

  // ---------- PC-speaker emulation ----------
  // DOS Lemmings plays the digging tool sounds (and a few UI sounds) through
  // the 1-bit PC speaker simultaneously with AdLib music; they are not part of
  // the AdLib driver's 18-SFX bank.  Approximated here with short square blips.
  var spkOsc = null, spkGain = null;
  function spkInit() {
    if (spkOsc || !audio || !audio.ctx) return false;
    try {
      spkOsc = audio.ctx.createOscillator();
      spkGain = audio.ctx.createGain();
      if (!spkGain.gain) { spkOsc = null; return false; }
      spkOsc.type = 'square';
      spkGain.gain.value = 0;
      spkOsc.connect(spkGain);
      spkGain.connect(audio.ctx.destination);
      spkOsc.start();
    } catch (e) { spkOsc = null; return false; }
    return true;
  }
  function spkBlink(freq, ms, vol) {
    if (!spkInit()) return;
    var t = audio.ctx.currentTime;
    try {
      spkOsc.frequency.setValueAtTime(freq, t);
      spkGain.gain.cancelScheduledValues(t);
      spkGain.gain.setValueAtTime(audio.sfxOn && !audio.muted ? (vol || 0.05) : 0, t);
      spkGain.gain.setValueAtTime(0, t + ms / 1000);
    } catch (e) { }
  }
  function spkDig()  { spkBlink(110, 55, 0.06); }              // low thud
  function spkMine() { spkBlink(340, 45, 0.05); }              // metallic chink
  function spkBash() { spkBlink(210, 60, 0.05); }              // whoosh/thud
  function spkNuke() {                                         // two-tone alarm
    if (!spkInit() || !audio || !audio.sfxOn || audio.muted) return;
    var t = audio.ctx.currentTime;
    try {
      [[880, 120], [660, 120], [880, 120], [660, 160]].forEach(function (p, i) {
        spkOsc.frequency.setValueAtTime(p[0], t + i * 0.13);
        spkGain.gain.setValueAtTime(i % 2 === 0 ? 0.06 : 0.06, t + i * 0.13);
      });
      spkGain.gain.setValueAtTime(0, t + 4 * 0.13);
    } catch (e) { }
  }

  function resetLevel(n) {
    state.level = loadLevel(n);
    carveShaft(state.level);
    doReset(n);
  }

  // test hook: reload a raw 80-section level with its embedded header stats
  function resetSection(n) {
    var lv = A.levels[n];
    state.level = loadLevel(-1, { section: n, name: lv.name, rate: lv.rate, lems: lv.lems, rescue: lv.rescue, time: lv.time, skills: lv.skills });
    carveShaft(state.level);
    doReset('s' + n);
  }

  function doReset(n) {
    state.lems = [];
    state.pending = state.level.lems;
    state.released = 0;
    state.rescued = 0;
    state.selSkill = -1;
    state.timeLeft = state.level.timelimit;
    state.cam = state.level.cam;
    state.releaseT = 0; // DOS: entrances open at frame 35, first release at frame 55
    state.entrance = 0;
    state.entranceCD = undefined;
    state.entFrame = 1;        // entrance door art: frame 1 = closed, animates to 0 = open
    state.entTriggered = false;
    state.nuked = false;
    state.nukeIdx = -1;
    state.fast = false;        // fast-forward never carries into a new map
    state.mapCv = null;
    state.over = null;
    state.rate = state.level.rate;
    state.mx = 160; state.mouseOn = false;
    state.acc = 0; state.last = 0;
    state.tick = 0;
    if (typeof n === 'number') savePref('level', n);
    // music: DOS assigns each level a tune from a fixed 17-track cycle that
    // advances in play order; the four special-graphics levels override with
    // their own exclusive songs.  Tune ids verified against the driver's
    // built-in debug key menu found in ADLIB.DAT (A..U = tunes 1..21).
    var tune;
    if (typeof n === 'number') {
      var spec = { 21: 2, 43: 9, 74: 1, 111: 3 };   // BeastI/Menace/Awesome/BeastII
      var cyc = [4, 6, 13, 7, 19, 14, 16, 5, 17, 8, 18, 20, 12, 21, 15, 11, 10];
      tune = spec[n] !== undefined ? spec[n] : cyc[n % cyc.length];
    } else {
      tune = 1 + Math.floor(Math.random() * 21);
    }
    if (audio) audio.playTune(tune);
    if (state.onReset) state.onReset(n);
  }

  // DOS CheckForGameFinished: time up, everyone removed, or nuked and none
  // left.  Success is only evaluated here: saved*100/total >= need*100/total.
  function checkGameFinished(L) {
    if (state.over) return true;
    var total = L.lems;
    var removed = 0, out = 0;
    for (var i = 0; i < state.lems.length; i++) {
      var l = state.lems[i];
      if (l.dead || l.rescued) removed++;
      else out++;
    }
    if (state.timeLeft <= 0 || removed >= total || (state.nuked && out === 0)) {
      var done = Math.floor(state.rescued * 100 / Math.max(1, total));
      var target = Math.floor(L.rescueNeed * 100 / Math.max(1, total));
      state.over = done >= target ? 'win' : 'lose';
      
      return true;
    }
    return false;
  }

  function stepSim(L) {
    if (state.over) return;
    if (checkGameFinished(L)) return;
    state.tick++;
    // ---- release (DOS: entrances open at frame 35, first release at frame 55; then (99-rate)/2+4) ----
    state.releaseT++;
    if (state.releaseT === 15 && audio) sfx(3);
    if (state.releaseT === 35) {
      state.entrance = 1;
      state.entTriggered = true;   // door animation starts (frame 1 = closed)
      if (audio) sfx(2);
    }
    if (state.entTriggered) {
      // entrance door animates once: 1..fr-1 then wraps to 0 (open) and rests
      var ent0 = L.entrances[0];
      var fr0 = ent0 ? ent0.fr : 10;
      state.entFrame++;
      if (state.entFrame >= fr0) { state.entFrame = 0; state.entTriggered = false; }
    }
    if (state.entrance && !state.nuked && state.pending > 0) {
      state.entranceCD = (state.entranceCD === undefined ? 20 : state.entranceCD) - 1;
      if (state.entranceCD <= 0) {
        state.entranceCD = ((99 - state.rate) / 2 | 0) + 4;
        var ent = L.entrances[L.order[state.released % 4]];
        var lx = ent.dx + 24, ly = ent.dy + 13;   // web y = DOS YPos - 1
        var lem = makeLem(L, lx, ly);
        if (solidAt(L, Math.round(lx + 4), Math.round(ly) + 1) ||
            solidAt(L, Math.round(lx + 11), Math.round(ly) + 1)) {
          lem.state = 'walk';
        } else {
          startFall(lem);   // DOS spawns as Falling with Fallen = 3
        }
        state.lems.push(lem);
        state.pending--; state.released++;
      }
    }
    // ---- nuking: one fuse assigned per iteration, in release order ----
    if (state.nuked && state.nukeIdx >= 0) {
      while (state.nukeIdx < state.lems.length &&
             (state.lems[state.nukeIdx].dead || state.lems[state.nukeIdx].rescued ||
              state.lems[state.nukeIdx].state === 'splat' || state.lems[state.nukeIdx].state === 'explode')) {
        state.nukeIdx++;
      }
      if (state.nukeIdx >= state.lems.length) {
        state.nukeIdx = -1;   // everyone processed
      } else {
        var nl = state.lems[state.nukeIdx];
        if (nl.explosionTimer === 0 && nl.state !== 'splat' && nl.state !== 'explode') {
          nl.explosionTimer = 79;
        }
        state.nukeIdx++;
        if (state.nukeIdx >= state.lems.length) state.nukeIdx = -1;
      }
    }
    // traps cooldown (fired traps clock back; DOS: re-arms after animation frame count)
    for (var zz = 0; zz < L.objs.length; zz++) {
      var zo = L.objs[zz];
      if (zo.dead) { zo.dead--; if (zo.dead < 0) zo.dead = 0; }
    }
    // update lemmings
    for (var i = 0; i < state.lems.length; i++) {
      var lem = state.lems[i];
      if (lem.dead || lem.rescued) continue;
      updateLem(L, lem);
      if (lem.rescued && !lem.rc) { lem.rc = 1; state.rescued++; }
      // ---- DOM interactive check (DOS CheckForInteractiveObjects; values < 128 = trap index) ----
      var sx = Math.round(lem.x), sy2 = Math.round(lem.y) + 1;
      var dv = domAt(L, sx, sy2);
      if (dv >= 0 && dv < 128) {
        var z = L.traps[dv];
        if (z && !z.dead) {
          z.dead = z.fr || 8;
          lem.dead = 1;
          // DOS plays each level object's own configured SFX number
          if (z.ob && z.ob.snd) sfx(z.ob.snd);
        }
      } else if (dv === DOM_EXIT) {
        // DOS: falling lems must land first (splatting can still exit - SplattingExitsBug)
        if (lem.state !== 'fall' && lem.state !== 'exit') { setAction(lem, 'exit'); sfx(16); }
      } else if (dv === DOM_FORCELEFT) {
        if (lem.dir > 0) lem.dir = -lem.dir;
      } else if (dv === DOM_FORCERIGHT) {
        if (lem.dir < 0) lem.dir = -lem.dir;
      } else if (dv === DOM_WATER) {
        if (lem.state !== 'drown') { setAction(lem, 'drown'); sfx(17); }
      } else if (dv === DOM_FIRE) {
        if (lem.state !== 'vapor') { setAction(lem, 'vapor'); sfx(13); }
      }
    }
    // time (game time: 17 sim ticks = 1 second, as in DOS)
    state.timeLeft -= 1 / 17;
    if (state.timeLeft < 0) state.timeLeft = 0;
    checkGameFinished(L);
    // camera: DOS-style cursor-proximity scrolling (dead zone around centre);
    // only while the cursor is over the play field, not the panel strip
    if (state.mouseOn && state.my < FIELD_H) {
      var dx = state.mx - 160;
      if (dx > 48) state.cam += Math.min(3, (dx - 48) / 32);
      else if (dx < -48) state.cam -= Math.min(3, (-48 - dx) / 32);
    }
    state.cam = Math.max(0, Math.min(state.cam, L.W - VIEW_W));
  }

  // ---------- rendering ----------
  function makeCanvas(w, h, mode) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    if (mode === 'flat') { c.getContext('2d').fillStyle = '#000'; c.getContext('2d').fillRect(0, 0, w, h); }
    return c;
  }
  function toImg(px, w, h, pal) {
    var c = makeCanvas(w, h);
    var ctx = c.getContext('2d');
    var id = ctx.createImageData(w, h);
    var d = id.data;
    for (var i = 0; i < w * h; i++) {
      var v = px[i];
      var r = 0, g = 0, b = 0;
      if (v) { var cc = pal[v] || pal[0]; r = cc[0]; g = cc[1]; b = cc[2]; }
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  var worldCanvases = {};
  function worldCanvas(L) {
    // the world bitmap changes whenever lemmings dig/bash/mine/build/explode;
    // those edits set L.worldDirty, forcing a re-render here
    if (L.canvas && !L.worldDirty) return L.canvas;
    var c = toImg(L.color, L.W, L.H, gfxSet(L.gfx).pal);
    L.canvas = c;
    L.worldDirty = false;
    return c;
  }

  // cached sprite canvas for one object frame (1-bit mask + 4bpp image)

  // Draw one frame of an animated level object, honoring the level entry's
  // drawing flags against the live terrain mask (DOS PrepareObjectBitmap):
  //   OnlyOnTerrain (mods & 0x40): pixel only where solid[]
  //   NoOverwrite   (mods & 0x80): pixel only where empty
  //   default: overwrite
  // Rendered as horizontal color runs each frame; object counts are small so
  // this is cheap, and it stays correct as diggers carve the mask.
  function drawAnimObject(ctx, L, zo, frame, sx, sy) {
    var G = gfxSet(L.gfx);
    var ob = G.objects[zo.id];
    if (!ob || !ob.all) return;
    var f = ob.all[frame] || ob.all[0];
    if (!f) return;
    var pal = G.pal;
    var flip = zo.disp === 0x8F;
    var mode = (zo.mods & 0x40) ? 2 : ((zo.mods & 0x80) ? 1 : 0);
    for (var yy = 0; yy < ob.h; yy++) {
      var srow = flip ? ob.h - 1 - yy : yy;
      var runX = -1, runCol = '';
      for (var xx = 0; xx <= ob.w; xx++) {
        var on = false, col = '';
        if (xx < ob.w) {
          var idx = srow * ob.w + xx;
          var v = f.img[idx];
          if (v && f.mask[idx]) {
            var lx = zo.dx + xx, ly = zo.dy + yy;
            var sol = (lx >= 0 && lx < L.W && ly >= 0 && ly < L.H) ? L.solid[ly * L.W + lx] : 0;
            on = mode === 2 ? !!sol : (mode === 1 ? !sol : true);
            if (on) {
              var cc = pal[v] || pal[0];
              col = cc[0] + ',' + cc[1] + ',' + cc[2];
            }
          }
        }
        if (runX >= 0 && (!on || col !== runCol)) {
          ctx.fillStyle = 'rgb(' + runCol + ')';
          ctx.fillRect(sx + runX, sy + yy, xx - runX, 1);
          runX = -1;
        }
        if (on && runX < 0) { runX = xx; runCol = col; }
      }
    }
  }

  // ---------- results notification ----------
  // A compact slide-out card in the upper-right of the game area (DOM, not
  // canvas) - keeps the map visible while showing verdict + stats + actions.
  var resultsShown = false;

  function syncResultsUI(L) {
    var el = document.getElementById('results');
    if (!el) return;
    if (!state.over) {
      resultsShown = null;
      el.classList.remove('show');
      return;
    }
    if (resultsShown !== state.over) {
      var win = state.over === 'win';
      resultsShown = state.over;
      document.getElementById('res-title').textContent = win ? 'Level cleared' : 'Level failed';
      var badge = document.getElementById('res-badge');
      badge.textContent = win ? 'CLEARED' : 'FAILED';
      badge.className = win ? 'badge good' : 'badge bad';
      var total = L.lems;
      var needPct = Math.floor(L.rescueNeed * 100 / Math.max(1, total));
      var mm = Math.max(0, Math.floor(state.timeLeft / 60));
      var ss = Math.max(0, Math.floor(state.timeLeft % 60));
      document.getElementById('res-rescued').textContent = state.rescued + ' of ' + total;
      document.getElementById('res-required').textContent = needPct + '%';
      document.getElementById('res-time').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
    }
    el.classList.add('show');
  }

  function hideResultsNow() { resultsShown = false; }

  // ---- persisted preferences (level, music, sfx) ----
  function loadPref(key, dflt) {
    try {
      var v = localStorage.getItem('lemmings.' + key);
      return v === null ? dflt : JSON.parse(v);
    } catch (e) { return dflt; }
  }
  function savePref(key, val) {
    try { localStorage.setItem('lemmings.' + key, JSON.stringify(val)); } catch (e) { }
  }

  function gotoLevel(idx) {
    resetLevel(idx);
    var sel = document.getElementById('lvlsel');
    if (sel) sel.value = idx;
  }
  function nextLevel() {
    gotoLevel(state.level ? (state.level.idx + 1) % A.menu.length : 0);
  }
  function prevLevel() {
    gotoLevel(state.level ? (state.level.idx + A.menu.length - 1) % A.menu.length : 0);
  }

  function drawSprite(ctx, lem, anim, f, x, y) {
    var a = anim.a;
    var tmp = makeCanvas(a.w, a.h, 'flat');
    var tctx = tmp.getContext('2d');
    var off = tctx.createImageData(a.w, a.h);
    var d = off.data;
    var pal = gfxSet(state.level.gfx).pal;
    var px = a.frames[f];
    for (var i = 0; i < a.w * a.h; i++) {
      var v = px[i];
      if (!v) continue;
      var cc = pal[v] || pal[0];
      d[i * 4] = cc[0]; d[i * 4 + 1] = cc[1]; d[i * 4 + 2] = cc[2]; d[i * 4 + 3] = 255;
    }
    tctx.putImageData(off, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, x, y);
    ctx.restore();
  }

  function draw() {
    var L = state.level;
    if (!L) return;
    var cv = document.getElementById('screen');
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var sc = 4;
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    var wc = worldCanvas(L);
    ctx.drawImage(wc, state.cam, 0, VIEW_W, FIELD_H, 0, 0, VIEW_W, FIELD_H);

    // animated objects (doors, traps, water/lava/slime): drawn over the world
    // every frame, honoring the level object's drawing flags against the live
    // terrain mask (OnlyOnTerrain / NoOverwrite), exactly like DOS
    // PrepareObjectBitmap + DrawObject.  Entrances animate once from frame 1
    // to 0 (open); triggered traps rest at their start frame until fired,
    // play one cycle, then rest again; continuous objects advance every tick.
    for (var oi = 0; oi < L.anims.length; oi++) {
      var zo = L.anims[oi];
      var ox2 = zo.dx - state.cam;
      if (ox2 < -zo.dw || ox2 > VIEW_W + 40) continue;
      var frame;
      if (zo.id === 1) {
        frame = state.entFrame % Math.max(1, zo.fr);       // entrance door
      } else if (zo.anim === 1) {
        frame = zo.dead > 0 ? Math.max(0, Math.min(zo.fr - zo.dead, zo.fr - 1)) : (zo.start || 0);
      } else {
        frame = ((zo.start || 0) + state.tick) % Math.max(1, zo.fr);   // continuous
      }
      drawAnimObject(ctx, L, zo, frame, Math.round(ox2), zo.dy);
    }

    // lemmings (DOS draws in release order - no z-sorting)
    for (var j = 0; j < state.lems.length; j++) {
      var l = state.lems[j];
      if (l.dead || l.rescued) continue;
      var sp = spriteFrame(L, l);
      if (!sp) continue;
      // DOS sprite box: (XPos - FootX, YPos - FootY); web y = DOS YPos - 1
      var foot = sp.a.foot || [8, 10];
      var sx = l.x - foot[0] - state.cam;
      if (sx < -24 || sx > VIEW_W + 24) continue;
      var sy = l.y + 1 - foot[1];
      drawSprite(ctx, l, sp, sp.f, Math.round(sx), Math.round(sy));
      // bomber countdown digit (DOS DrawLemmings: 65-79 -> 5 ... 0-16 -> 1),
      // drawn at (XPos-1, YPos+FrameTopDy-12)
      if (l.explosionTimer > 0) {
        var dgt = l.explosionTimer > 64 ? 5 : l.explosionTimer > 48 ? 4 :
                  l.explosionTimer > 32 ? 3 : l.explosionTimer > 16 ? 2 : 1;
        var cd = countdownDigits()[dgt - 1];
        ctx.fillStyle = 'rgb(240,208,208)';
        var cdx = Math.round(l.x) - 1 - state.cam, cdy = Math.round(l.y) + 1 - foot[1] - 12;
        for (var cy9 = 0; cy9 < 8; cy9++) for (var cx9 = 0; cx9 < 8; cx9++) {
          if (cd[cy9 * 8 + cx9]) ctx.fillRect(cdx + cx9, cdy + cy9, 1, 1);
        }
      }
    }

    // skill target box (DOS): with a skill selected and the cursor over the
    // field, outline the 12x12 hit box of the lemming under the cursor
    if (state.selSkill >= 0 && state.mouseOn && state.my < FIELD_H) {
      var tx = state.mx + state.cam;
      var tg = null;
      for (var hi = 0; hi < state.lems.length; hi++) {
        var hl = state.lems[hi];
        if (hl.dead || hl.rescued) continue;
        var hsp = spriteFrame(L, hl);
        if (!hsp) continue;
        var hf = hsp.a.foot || [8, 10];
        var hx0 = Math.round(hl.x) - hf[0], hy0 = Math.round(hl.y) + 1 - hf[1];
        if (tx >= hx0 && tx <= hx0 + 12 && state.my >= hy0 && state.my <= hy0 + 12) {
          tg = { x0: hx0, y0: hy0 };
          // mid-skill lems win over walkers (DOS PrioritizedHitTest order)
          if (hl.state === 'block' || hl.state === 'build' || hl.state === 'shrug' ||
              hl.state === 'bash' || hl.state === 'mine' || hl.state === 'dig' || hl.state === 'ohno') break;
        }
      }
      if (tg) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.strokeRect(tg.x0 - state.cam, tg.y0, 13, 13);
      }
    }

    // panel
    var pan = toImg(unpack4(b64d(A.main.panel), 320, 40), 320, 40, gfxSet(L.gfx).pal);
    ctx.drawImage(pan, 0, FIELD_H);
    var digs = statFont();
    var stripCache = {};
// top-row strip (original DOS layout, verified against oldgames.sk captures):
      // 8x16 sec6 font, glyph pitch 8, strip top = panel row 0, screen y160.
      // Font is 3bpp with its own palette (correlated vs native capture):
      // v0 = transparent, v1/v2 = green 0,176,0, v3 = DOS white 240,208,208
      function stripGlyph(ch) {
        if (stripCache[ch]) return stripCache[ch];
        var d = digs[ch];
        var c2 = makeCanvas(8, 16, 'flat');
        var c2x = c2.getContext('2d');
        var id = c2x.createImageData(8, 16);
        for (var yy = 0; yy < 16; yy++) for (var xx = 0; xx < 8; xx++) {
          var v = d[yy * 8 + xx], o = (yy * 8 + xx) * 4;
          if (v >= 3) { id.data[o] = 240; id.data[o + 1] = 208; id.data[o + 2] = 208; id.data[o + 3] = 255; }
          else if (v > 0) { id.data[o] = 0; id.data[o + 1] = 176; id.data[o + 2] = 0; id.data[o + 3] = 255; }
          else id.data[o + 3] = 0;
        }
        c2x.putImageData(id, 0, 0);
        stripCache[ch] = c2;
        return c2;
      }
    function drawWord(x, s) {
      for (var i = 0; i < s.length; i++) {
        if (!digs[s[i]]) continue;
        ctx.drawImage(stripGlyph(s[i]), x + i * 8, FIELD_H);
      }
    }
    function drawNumL(x, n, w) {
      var s = '' + Math.max(0, n);
      for (var c = 0; c < s.length; c++) ctx.drawImage(stripGlyph(s[c]), x + c * 8, FIELD_H);
    }
    function drawNumR(x, n, w) {
      var s = '' + Math.max(0, n);
      for (var c = 0; c < s.length; c++) ctx.drawImage(stripGlyph(s[c]), x - (s.length - 1 - c) * 8, FIELD_H);
    }
    drawWord(112, 'OUT');
    drawWord(184, 'IN');
    drawWord(248, 'TIME');
    // DOS toolbar: OUT = LemmingsOut (spawned and not yet removed),
    // IN% = trunc(saved * 100 / total level lemmings)
    var alive = 0;
    for (var av = 0; av < state.lems.length; av++) {
      if (!state.lems[av].dead && !state.lems[av].rescued) alive++;
    }
    drawNumL(144, alive, 2);                                 // OUT count
    var pct = Math.floor(state.rescued * 100 / Math.max(1, L.lems));
    drawNumR(216, pct, 3);                               // IN % right-aligned ending @216
    drawWord(224, '%');                                  // ('0'@216; '90'@208+216; '100'@200..216)
    var mm = Math.floor(state.timeLeft / 60), ss = Math.floor(state.timeLeft % 60);
    drawNumR(288, mm, 1);
    drawWord(296, '-');
    drawNumR(312, ss, 2);
    // cursor-hover status word (DOS HitTest -> SetInfoCursorLemming):
    // "<action name> <hit count>" in the left strip area
    if (state.mouseOn && state.my < FIELD_H && !state.over) {
      var hv = lemHitsAt(state.mx + state.cam, state.my);
      if (hv.lem) {
        var hl2 = hv.lem, hn = null;
        if (hl2.climber && hl2.floater) hn = 'ATHLETE';
        else if (hl2.climber) hn = 'CLIMBER';
        else if (hl2.floater) hn = 'FLOATER';
        else hn = { walk: 'WALKER', jump: 'JUMPER', fall: 'FALLER', float: 'FLOATER',
                    climb: 'CLIMBER', hoist: 'HOISTER', build: 'BUILDER', bash: 'BASHER',
                    mine: 'MINER', dig: 'DIGGER', block: 'BLOCKER', shrug: 'SHRUGGER',
                    ohno: 'OHNOER', splat: 'SPLATTER', exit: 'EXITER', vapor: 'FRIER',
                    drown: 'DROWNER', explode: 'BOMBER' }[hl2.state] || '';
        drawWord(0, hn + ' ' + hv.count);
      }
    }

    // runtime count cells — user-tuned cosmetic layout (deviates from DOS):
    // each cell blits 6x5 (narrower + shorter than the DOS 8x8), shifted
    // 5px left / 2px down from the classic spot; zero-count renders BLACK
    // instead of DOS's solid white box.
    var hud = hudDigits();
    var cntVals = [state.level.rate, state.rate];
    for (var s = 0; s < 8; s++) cntVals.push(L.skills[s]);
    if (!cntCellCache) cntCellCache = {};
    function countCell(vv) {
      if (cntCellCache[vv]) return cntCellCache[vv];
      var c9 = makeCanvas(8, 8);
      var cx9b = c9.getContext('2d');
      cx9b.fillStyle = '#000000';
      cx9b.fillRect(0, 0, 8, 8);
      if (vv > 0) {
        cx9b.fillStyle = 'rgb(240,208,208)';
        var gL = hud[Math.floor(vv / 10) * 2 + 1], gR = hud[(vv % 10) * 2];
        for (var yy = 0; yy < 8; yy++) for (var xx = 0; xx < 4; xx++) {
          if (gL[yy * 8 + xx]) cx9b.fillRect(xx, yy, 1, 1);
          if (gR[yy * 8 + 4 + xx]) cx9b.fillRect(4 + xx, yy, 1, 1);
        }
      }
      cntCellCache[vv] = c9;
      return c9;
    }
    // 6x5 black cell, 2px lower than the DOS spot, horizontally centered
    // within each button's 16px slot
    for (var k = 0; k < 10; k++) {
      ctx.drawImage(countCell(cntVals[k]), 16 * k + 5.5, FIELD_H + 19.5, 6, 5);
    }

    // mini-map: whole level downscaled into the art window (x209..319, y17..37)
    var mw = 107, mh = 19;
    if (!state.mapCv) {
      state.mapCv = makeCanvas(mw, mh);
      var mctx = state.mapCv.getContext('2d');
      mctx.imageSmoothingEnabled = false;
      mctx.drawImage(worldCanvas(L), 0, 0, L.W, L.H, 0, 0, mw, mh);
    }
    ctx.drawImage(state.mapCv, 210, FIELD_H + 18);
    var mapRatio = L.W / mw;
    var iw = Math.max(3, Math.round(VIEW_W / mapRatio));
    ctx.strokeStyle = 'rgb(240,208,208)'; ctx.lineWidth = 1;
    ctx.strokeRect(210 + Math.round(state.cam / mapRatio), FIELD_H + 18, iw, mh);

    // selected skill highlight — DOS: white outline around the whole button,
    // button k = 16k..16k+15 (skill s = button s+2 -> x 32+16s), rows 16..39
    if (state.selSkill >= 0) {
      var bx = 32 + state.selSkill * 16;
      ctx.fillStyle = 'rgb(240,208,208)';
      ctx.fillRect(bx, FIELD_H + 16, 16, 1);
      ctx.fillRect(bx, FIELD_H + 39, 16, 1);
      ctx.fillRect(bx, FIELD_H + 16, 1, 24);
      ctx.fillRect(bx + 15, FIELD_H + 16, 1, 24);
    }
    // PAUSE button keeps a persistent outline while paused (button x160..175)
    if (state.paused) {
      ctx.fillStyle = 'rgb(240,208,208)';
      ctx.fillRect(160, FIELD_H + 16, 16, 1);
      ctx.fillRect(160, FIELD_H + 39, 16, 1);
      ctx.fillRect(160, FIELD_H + 16, 1, 24);
      ctx.fillRect(175, FIELD_H + 16, 1, 24);
    }
    // FAST-FORWARD toggle: small recessed chip tucked between Nuke and the
    // minimap window (styled like the panel art's dark slots so it blends in;
    // lights up DOS-white when active)
    var fx = 195, fy = FIELD_H + 18, fs = 11;
    ctx.fillStyle = state.fast ? 'rgba(240,208,208,0.14)' : 'rgba(8,10,14,0.85)';
    ctx.fillRect(fx, fy, fs, fs);
    ctx.strokeStyle = state.fast ? 'rgb(240,208,208)' : '#3a4560';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, fs - 1, fs - 1);
    ctx.strokeStyle = state.fast ? '#ffffff' : '#7d8595';
    ctx.beginPath();
    ctx.moveTo(fx + 3, fy + 3);
    ctx.lineTo(fx + 6.5, fy + 5.5);
    ctx.lineTo(fx + 3, fy + 8);
    ctx.moveTo(fx + 6.5, fy + 3);
    ctx.lineTo(fx + 10 - 1, fy + 5.5);
    ctx.lineTo(fx + 6.5, fy + 8);
    ctx.stroke();
    // message
    syncResultsUI(L);
    if (!state.over && state.msgT > 0) {
      ctx.fillStyle = '#fff';
      ctx.fillText(state.msg, 10, 12);
      state.msgT--;
    }

    // panel button tooltips (hover): small label near the cursor
    if (state.mouseOn && state.my >= FIELD_H && !state.over) {
      var tip = null;
      if (state.mx < 16) tip = 'SLOWER — release rate down';
      else if (state.mx < 32) tip = 'FASTER — release rate up';
      else if (state.mx < 160) {
        var tk = Math.floor((state.mx - 32) / 16);
        tip = ['CLIMBER', 'FLOATER', 'BOMBER', 'BLOCKER',
               'BUILDER', 'BASHER', 'MINER', 'DIGGER'][tk] || null;
      }
      else if (state.mx < 176) tip = state.paused ? 'RESUME' : 'PAUSE';
      else if (state.mx < 192) tip = 'NUKE ALL';
      else if (state.mx < 208) tip = state.fast ? 'FAST-FORWARD: ON' : 'FAST-FORWARD';
      if (tip) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        var tw = Math.ceil(ctx.measureText(tip).width) + 14;
        var tx2 = Math.min(Math.max(state.mx * 4 - tw / 2, 6), VIEW_W * 4 - tw - 6);
        var ty2 = state.my * 4 - 30;
        if (ty2 < 6) ty2 = state.my * 4 + 20;
        ctx.fillStyle = 'rgba(10,13,20,0.93)';
        ctx.strokeStyle = '#3a4560';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(tx2, ty2, tw, 22, 5); } else { ctx.rect(tx2, ty2, tw, 22); }
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e8eefc';
        ctx.textBaseline = 'middle';
        ctx.fillText(tip, tx2 + 7, ty2 + 11.5);
        ctx.restore();
      }
    }
  }

  // ---------- input ----------
  function bindUI() {
    var sel = document.getElementById('lvlsel');
    for (var i = 0; i < A.menu.length; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.text = A.menu[i].rank + ' ' + A.menu[i].num + ': ' + A.menu[i].name.trim();
      sel.appendChild(o);
    }
    sel.addEventListener('change', function () { resetLevel(parseInt(sel.value, 10)); });
    document.getElementById('reset').addEventListener('click', function () { resetLevel(state.level ? state.level.idx : 0); });
    function setMusicBtn(on) {
      var el = document.getElementById('music');
      if (!el) return;
      el.textContent = on ? 'Music: on' : 'Music: off';
      el.className = on ? 'on' : 'off';
    }
    function setSfxBtn(on) {
      var el = document.getElementById('sfxbtn');
      if (!el) return;
      el.textContent = on ? 'SFX: on' : 'SFX: off';
      el.className = on ? 'on' : 'off';
    }
    window.setMusicBtn = setMusicBtn;
    window.setSfxBtn = setSfxBtn;
    var rr = document.getElementById('res-retry');
    var rn2 = document.getElementById('res-next');
    if (rr) rr.addEventListener('click', function () { resetLevel(state.level ? state.level.idx : 0); });
    if (rn2) rn2.addEventListener('click', function () { nextLevel(); });
    var pb = document.getElementById('prev');
    var nb = document.getElementById('next');
    if (pb) pb.addEventListener('click', function () { prevLevel(); });
    if (nb) nb.addEventListener('click', function () { nextLevel(); });
    // restore persisted settings
    if (audio) {
      audio.setMusicOn(loadPref('music', true));
      audio.setSfxOn(loadPref('sfx', true));
      setMusicBtn(audio.musicOn);
      setSfxBtn(audio.sfxOn);
    }
    var mb = document.getElementById('music');
    var sb = document.getElementById('sfxbtn');
    if (mb) mb.addEventListener('click', function () { if (audio) { audio.unlock(); setMusicBtn(audio.toggleMusic()); } });
    if (sb) sb.addEventListener('click', function () { if (audio) { audio.unlock(); setSfxBtn(audio.toggleSfx()); } });
    // browsers keep the AudioContext suspended until a user gesture; unlock
    // audio on any of them so clicks alone start the music
    function unlockAudio() { if (audio) { audio.unlock(); state.msgT = 0; } }
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('keydown', function (e) {
      switch (e.key) {
        case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8':
          state.selSkill = parseInt(e.key, 10) - 1; sfx(1); break;
        case 'p': case 'P': state.paused = !state.paused; break;
        case 'n': case 'N': nukeAll(state.level); break;
        case 'f': case 'F': state.fast = !state.fast; break;
        case 'Enter': case ' ': if (state.over) nextLevel(); break;
        case 'r': case 'R': resetLevel(state.level ? state.level.idx : 0); break;
        case 'm': case 'M': if (audio) setMusicBtn(audio.toggleMusic()); break;
        case 's': case 'S': if (audio) setSfxBtn(audio.toggleSfx()); break;
        case 'ArrowLeft': prevLevel(); break;
        case 'ArrowRight': nextLevel(); break;
        case '+': case '=': state.rate = Math.min(state.rate + 5, 99); break;
        case '-': case '_': state.rate = Math.max(state.rate - 5, state.level ? state.level.rate : 1); break;
        case 'Escape': state.selSkill = -1; break;
      }
    });
    var cv = document.getElementById('screen');
    cv.addEventListener('mousemove', function (e) {
      var rect = cv.getBoundingClientRect();
      state.mx = (e.clientX - rect.left) / rect.width * VIEW_W;
      state.my = (e.clientY - rect.top) / rect.height * VIEW_H;
      state.mouseOn = true;
    });
    cv.addEventListener('mouseleave', function () { state.mouseOn = false; });
    cv.addEventListener('pointerdown', function (e) {
      var rect = cv.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width * VIEW_W;
      var py = (e.clientY - rect.top) / rect.height * VIEW_H;
      if (state.over) return;
      if (!(py < FIELD_H)) return;                 // panel handled on click
      var best = pickLem(px + state.cam, py);
      if (best && state.selSkill >= 0) {
        state.__ptAssign = 1;                      // guard the follow-up click
        assignSkill(state.level, best, state.selSkill);
      }
    });
    cv.addEventListener('click', function (e) {
      if (state.over) return;                      // results card handles input
      var rect = cv.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width * VIEW_W;
      var py = (e.clientY - rect.top) / rect.height * VIEW_H;
      if (py >= FIELD_H) {
        // DOS panel buttons (verified via selection box at 16k..16k+15):
        // Slower x0..15, Faster x16..31, skills x32+16s, Pause x160..175,
        // Nuke x176..191, FF chip x194..208, mini-map x209+
        // DOS AdjustReleaseRate clamps to [level rate, 99]
        if (px >= 0 && px < 16) { state.rate = Math.max(state.rate - 5, state.level ? state.level.rate : 1); return; }
        if (px >= 16 && px < 32) { state.rate = Math.min(state.rate + 5, 99); return; }
        var k = Math.floor((px - 32) / 16);
        if (k >= 0 && k < 8) { state.selSkill = k; sfx(1); return; }
        if (px >= 160 && px < 176) { state.paused = !state.paused; return; }
        if (px >= 176 && px < 192) { nukeAll(state.level); return; }
        if (px >= 194 && px < 208) { state.fast = !state.fast; return; }
        // mini-map click: move the camera there
        if (px >= 209) {
          var Lc = state.level;
          state.cam = Math.max(0, Math.min(Lc.W - VIEW_W, ((px - 210) / 107) * Lc.W - VIEW_W / 2));
          return;
        }
        return;
      }
      if (state.__ptAssign) { state.__ptAssign = 0; return; } // already assigned on pointer-down
      var best = pickLem(px + state.cam, py);
      if (best && state.selSkill >= 0) assignSkill(state.level, best, state.selSkill);
    });
  }

  // DOS PrioritizedHitTest: 12x12 box at the sprite top-left (XPos-FootX,
  // YPos-FootY); lems mid-skill (blocking/building/shrugging/bashing/mining/
  // digging/ohnoing) win over walkers
  function lemHitsAt(wx, py) {
    var L = state.level;
    var best = null, nonPrio = null, count = 0;
    for (var i = 0; i < state.lems.length; i++) {
      var l = state.lems[i];
      if (l.dead || l.rescued) continue;
      var sp = spriteFrame(L, l);
      if (!sp) continue;
      var f0 = sp.a.foot || [8, 10];
      var bx0 = Math.round(l.x) - f0[0], by0 = Math.round(l.y) + 1 - f0[1];
      if (wx >= bx0 && wx <= bx0 + 12 && py >= by0 && py <= by0 + 12) {
        count++;
        if (l.state === 'block' || l.state === 'build' || l.state === 'shrug' ||
            l.state === 'bash' || l.state === 'mine' || l.state === 'dig' || l.state === 'ohno') {
          best = l;
        } else if (!nonPrio) {
          nonPrio = l;
        }
      }
    }
    return { lem: best || nonPrio, count: count };
  }
  function pickLem(wx, py) { return lemHitsAt(wx, py).lem; }

  // ---------- main loop (fixed-timestep sim at 17 Hz, DOS rate) ----------
  var TICK_MS = 1000 / 17;
  function loop(now) {
    if (state.last) state.acc += Math.min(now - state.last, 1000);
    state.last = now;
    if (!state.paused && state.level) {
      if (!state.acc || isNaN(state.acc)) state.acc = 0;
      var budget = state.fast ? 30 : 6;
      while (state.acc >= TICK_MS && budget-- > 0) {
        state.acc -= TICK_MS;
        var steps = state.fast ? 3 : 1;
        for (var s = 0; s < steps; s++) stepSim(state.level);
      }
      if (budget < 0) state.acc = 0;
    }
    draw();
    requestAnimationFrame(loop);
  }

  // node smoke-test hook
  if (typeof document === 'undefined') {
    window._lemTest = {
      loadLevel: loadLevel, resetLevel: resetLevel, resetSection: resetSection, stepSim: stepSim, state: state,
      applyMask: applyMask, assignSkill: assignSkill, audio: audio, nukeAll: nukeAll,
      renderWorld: function () {
        var L = state.level;
        if (!L) return null;
        var pal = gfxSet(L.gfx).pal;
        var rgb = new Uint8ClampedArray(L.W * L.H * 3);
        for (var i = 0; i < L.W * L.H; i++) {
          var v = L.color[i];
          if (!v) continue;
          var c = pal[v] || pal[0];
          rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2];
        }
        var rects = [];
        for (var k = 0; k < L.objs.length; k++) {
          var ob = L.objs[k];
          if (ob.dw > 0 && ob.dh > 0) rects.push([ob.dx, ob.dy, ob.dw, ob.dh]);
        }
        return { w: L.W, h: L.H, rgb: rgb, rects: rects };
      }
    };
  } else {
    window._lemTest = { state: state, audio: audio, resetLevel: resetLevel, stepSim: stepSim, assignSkill: assignSkill, nukeAll: nukeAll };
    bindUI();
    // restore persisted level after the dropdown has been populated
    gotoLevel(Math.max(0, Math.min(A.menu.length - 1, loadPref('level', 0) | 0)));
    if (audio) { state.msg = audio.muted ? '' : 'click or press any key to enable sound'; state.msgT = 180; }
    loop();
  }
})();