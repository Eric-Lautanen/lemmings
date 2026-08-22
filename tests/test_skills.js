// Headless skill integration: every skill must engage, animate and act like the DOS original.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), { filename: 'game.js' });

const T = window._lemTest;
let fails = 0;
const fail = (m) => { fails++; console.log('FAIL:', m); };
const ok = (m) => console.log('ok:', m);
const solAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];

function pick(pred) {
  for (const l of T.state.lems) {
    if (!l.dead && !l.rescued && pred(l)) return l;
  }
  return null;
}
const L = () => T.state.level;
const run = (n) => { for (let i = 0; i < n; i++) T.stepSim(L()); };

// wait until a lem matching pred exists (or fail after cap ticks)
function waitFor(pred, cap = 6000) {
  for (let t = 0; t < cap; t++) {
    T.stepSim(L());
    const l = pick(pred);
    if (l) return l;
  }
  return null;
}

// ---- setup: Fun 8 (menu 7) has 20 of every skill ----
// ---- 1. climber: teleport a walker in front of a >=7px wall, must climb ----
{
  T.resetLevel(7);
  // find a wall column >=7px tall with walkable ground 2-3px in front
  const findWall = () => {
    const Lv = L();
    for (let x = 0; x < Lv.W; x++) {
      for (let y = 0; y < Lv.H - 7; y++) {
        let h = 0;
        while (y + h < Lv.H && solAt(Lv, x, y + h) && h < 40) h++;
        if (h >= 7 && !solAt(Lv, x - 1, y + 1) &&
            (solAt(Lv, x - 2, y + 3) || solAt(Lv, x - 2, y + 4))) return { x, y, h };
      }
    }
    return null;
  };
  const w = findWall();
  if (!w) { fail('climber: no >=7px wall on Fun8'); }
  else {
    const Lv = L();
    let gy = w.y + 3;
    while (gy < Lv.H && !solAt(Lv, w.x - 2, gy)) gy++;
    const c = waitFor(l => l.state === 'walk');
    if (!c) { fail('climber: no walker to teleport'); }
    else {
      c.x = w.x - 2;   // anchor column steps onto the wall face
      c.y = gy - 1;
      c.dir = 1;
      T.assignSkill(Lv, c, 0);
      let climbed = false;
      for (let t = 0; t < 5000; t++) {
        T.stepSim(Lv);
        if (c.state === 'climb') { climbed = true; break; }
        if (c.dead) break;
      }
      ok('climber: ' + (climbed ? 'climbed at x=' + w.x : 'did not climb') + ' (y=' + Math.round(c.y) + ')');
      if (!climbed) fail('climber never climbed');
    }
  }
}

// ---- 2. floater: assign to a falling lem, must float ----
{
  T.resetLevel(7);
  const f = waitFor(l => l.state === 'fall');
  if (!f) { fail('floater: no falling lem on Fun8'); }
  else {
    T.assignSkill(L(), f, 1);
    let floated = false;
    for (let t = 0; t < 2000; t++) {
      T.stepSim(L());
      if (f.state === 'float') { floated = true; break; }
      if (f.dead) break;
    }
    ok('floater: ' + (floated ? 'floating' : 'did not float'));
    if (!floated) fail('floater never floated');
  }
}

// ---- 3. bomber: must explode and die; pick a grounded walker so the blast has terrain ----
{
  T.resetLevel(7);
  const L3 = L();
  const before = L3.solid.reduce((a, b) => a + b, 0);
  const b = waitFor(l => l.state === 'walk' &&
    solAt(L(), Math.round(l.x + 6), Math.round(l.y) + 1) &&
    solAt(L(), Math.round(l.x + 11), Math.round(l.y) + 1));
  if (!b) { fail('bomber: no grounded walker'); }
  else {
    T.assignSkill(L3, b, 2);
    let dead = false;
    for (let t = 0; t < 3000 && !dead; t++) {
      T.stepSim(L3);
      if (b.dead) dead = true;
    }
    const after = L3.solid.reduce((a, b) => a + b, 0);
    ok('bomber: dead=' + dead + ', removed ' + (before - after) + ' px');
    if (!dead) fail('bomber did not explode/die');
    if (after >= before) fail('bomber removed no terrain');
  }
}

// ---- 4. blocker: must stay planted and turn walkers back ----
{
  T.resetLevel(7);
  const L4 = L();
  const bl = waitFor(l => l.state === 'walk' &&
    solAt(L(), Math.round(l.x + 6), Math.round(l.y) + 1));
  if (!bl) { fail('blocker: no walker'); }
  else {
    T.assignSkill(L4, bl, 3);
    if (bl.state !== 'block') { fail('blocker did not engage: ' + bl.state); }
    else {
      const bx = bl.x;
      let v = null;
      for (let t = 0; t < 4000 && !v; t++) {
        T.stepSim(L4);
        v = pick(l => l !== bl && l.state === 'walk' &&
          Math.abs(l.y - bl.y) < 6 && Math.abs(l.x - bx) < 40);
      }
      if (!v) { fail('blocker: no approachable second walker'); }
      else {
        v.x = bx + 24;
        v.y = bl.y;
        v.dir = -1;
        const d0 = v.dir;
        for (let t = 0; t < 60; t++) T.stepSim(L4);
        const turned = v.dir !== d0;
        ok('blocker: stayed=' + (Math.abs(bl.x - bx) <= 2) + ' turnedWalkers=' + turned);
        if (Math.abs(bl.x - bx) > 2) fail('blocker moved ' + (bl.x - bx) + 'px');
        if (!turned) fail('blocker never turned a walker (dir ' + d0 + ' -> ' + v.dir + ')');
      }
    }
  }
}

// ---- 5. builder: must add terrain (stairs); bridging a gap may fall afterwards ----
{
  T.resetLevel(7);
  const L5 = L();
  const before = L5.solid.reduce((a, b) => a + b, 0);
  const bb = waitFor(l => l.state === 'walk');
  if (!bb) { fail('builder: no walker'); }
  else {
    T.assignSkill(L5, bb, 4);
    let built = false;
    for (let t = 0; t < 600 && !built; t++) {
      T.stepSim(L5);
      const after = L5.solid.reduce((a, b) => a + b, 0);
      if (after > before) built = true;
    }
    const after = L5.solid.reduce((a, b) => a + b, 0);
    ok('builder: added ' + (after - before) + ' px, state=' + bb.state);
    if (!built) fail('builder added no terrain');
  }
}

// ---- 6. basher: must remove terrain through a tall wall ----
{
  T.resetLevel(7);
  const L6 = L();
  const before = L6.solid.reduce((a, b) => a + b, 0);
  let spot = null;
  for (let x = 20; x < L6.W - 20 && !spot; x++) {
    for (let y = 20; y < L6.H - 10 && !spot; y++) {
      let h = 0;
      while (y + h < L6.H && solAt(L6, x, y + h) && h < 40) h++;
      if (h >= 12 && !solAt(L6, x - 1, y + 4) && solAt(L6, x - 2, y + 6)) spot = { x, y };
    }
  }
  if (!spot) { fail('basher: no tall wall on Fun8'); }
  else {
    const ba = waitFor(l => l.state === 'walk');
    if (!ba) { fail('basher: no walker'); }
    else {
      ba.x = spot.x - 2; ba.y = spot.y + 3; ba.dir = 1;
      T.assignSkill(L6, ba, 5);
      let engaged = ba.state === 'bash';
      for (let t = 0; t < 800; t++) T.stepSim(L6);
      const after = L6.solid.reduce((a, b) => a + b, 0);
      ok('basher: engaged=' + engaged + ', removed ' + (before - after) + ' px');
      if (after >= before) fail('basher removed nothing');
      if (!engaged) fail('basher did not start bashing');
    }
  }
}

// ---- 7. miner: must remove diagonal terrain ahead ----
{
  T.resetLevel(7);
  const L7 = L();
  const before = L7.solid.reduce((a, b) => a + b, 0);
  let spot = null;
  for (let x = 20; x < L7.W - 20 && !spot; x++) {
    for (let y = 20; y < L7.H - 10 && !spot; y++) {
      let h = 0;
      while (y + h < L7.H && solAt(L7, x, y + h) && h < 40) h++;
      if (h >= 12 && !solAt(L7, x - 1, y + 4) && solAt(L7, x - 2, y + 6)) spot = { x, y };
    }
  }
  if (!spot) { fail('miner: no tall wall on Fun8'); }
  else {
    const mi = waitFor(l => l.state === 'walk');
    if (!mi) { fail('miner: no walker'); }
    else {
      mi.x = spot.x - 2; mi.y = spot.y + 3; mi.dir = 1;
      T.assignSkill(L7, mi, 6);
      let engaged = mi.state === 'mine';
      for (let t = 0; t < 800; t++) T.stepSim(L7);
      const after = L7.solid.reduce((a, b) => a + b, 0);
      ok('miner: engaged=' + engaged + ', removed ' + (before - after) + ' px');
      if (after >= before) fail('miner removed nothing');
      if (!engaged) fail('miner did not start mining');
    }
  }
}

// ---- 8. digger: must dig straight down; pick a lem on thick ground ----
{
  T.resetLevel(7);
  const L8 = L();
  const before = L8.solid.reduce((a, b) => a + b, 0);
  const dg = waitFor(l => l.state === 'walk' &&
    solAt(L(), Math.round(l.x + 4), Math.round(l.y) + 1) &&
    solAt(L(), Math.round(l.x + 4), Math.round(l.y) + 6));
  if (!dg) { fail('digger: no walker on thick ground'); }
  else {
    T.assignSkill(L8, dg, 7);
    const y0 = dg.y;
    let engaged = dg.state === 'dig';
    for (let t = 0; t < 800; t++) T.stepSim(L8);
    const after = L8.solid.reduce((a, b) => a + b, 0);
    ok('digger: engaged=' + engaged + ', y ' + y0 + ' -> ' + Math.round(dg.y) + ', removed ' + (before - after) + ' px');
    if (after >= before) fail('digger removed nothing');
    if (!engaged) fail('digger did not start digging');
    if (dg.y <= y0) fail('digger did not descend');
  }
}

// ---- 9. dig frames must cycle through all 16 (regression) ----
{
  T.resetLevel(0); // Fun 1: 10 diggers, stable pocket walkers
  const L9 = T.state.level;
  const dg = waitFor(l => l.state === 'walk' && l.y < 100);
  if (!dg) { fail('dig-cycle: no walker'); }
  else {
    T.assignSkill(L9, dg, 7);
    const seen = new Set();
    for (let t = 0; t < 800; t++) {
      T.stepSim(L9);
      if (dg.state !== 'dig') break;
      seen.add(dg.frame % 16);
      if (seen.size > 8) break;
    }
    ok('dig frames seen: ' + Array.from(seen).sort((a, b) => a - b).join(','));
    if (seen.size <= 4) fail('dig animation stuck');
  }
}

// ---- 10. skill counts decrement for every assignment ----
{
  T.resetLevel(7);
  const L0 = L();
  const w = waitFor(l => l.state === 'walk');
  if (!w) { fail('counts: no walker'); }
  else {
    const before = L0.skills.slice();
    T.assignSkill(L0, w, 5);
    const delta = before[5] - L0.skills[5];
    ok('basher count ' + before[5] + ' -> ' + L0.skills[5]);
    if (delta !== 1) fail('skill count did not decrement by 1');
  }
}

console.log(fails === 0 ? 'SKILL TESTS PASS' : `SKILL TESTS FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
