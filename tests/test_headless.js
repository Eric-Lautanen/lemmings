// Headless engine tests: crash-free simulation on all 120 menu levels + behavior checks.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), { filename: 'game.js' });

const T = window._lemTest;
const A = window.GAME_ASSETS;
let fails = 0;
function fail(msg) { fails++; console.log('FAIL:', msg); }

// ---- 0. menu integrity ----
if (A.menu.length !== 120) fail('menu has ' + A.menu.length + ' entries, expected 120');
const seen = {};
for (const m of A.menu) {
  const key = m.rank + ' ' + m.num;
  if (seen[key]) fail('duplicate menu slot ' + key);
  seen[key] = 1;
  if (m.section < 0 || m.section >= 80) fail('menu slot ' + key + ' bad section ' + m.section);
  if (m.lems < 1 || m.lems > 100) fail('menu slot ' + key + ' lems=' + m.lems);
  if (m.rescue < 1 || m.rescue > m.lems) fail('menu slot ' + key + ' rescue=' + m.rescue);
}
console.log('menu integrity ok');

// ---- 1. all 120 menu levels: 1200 ticks, no exceptions, no NaN ----
for (let lvl = 0; lvl < 120; lvl++) {
  try {
    T.resetLevel(lvl);
    const L = T.state.level;
    for (let t = 0; t < 1200; t++) {
      T.stepSim(L);
      for (const l of T.state.lems) {
        if (!isFinite(l.x) || !isFinite(l.y)) { throw new Error('NaN at ' + lvl); }
        if (l.x < -100 || l.x > 1700 || l.y < -100 || l.y > 400) { throw new Error('out of bounds ' + lvl); }
      }
      if (L.solid.length !== 1600 * 160) throw new Error('solid size');
      if (T.state.over) break;
    }
  } catch (e) {
    fail(`lvl ${lvl}: ${e.message}`);
  }
}
console.log('part 1 (crash-free, 120 levels) done, fails=' + fails);

// ---- 2. skill behavior: basher removes terrain through a tall wall ----
T.resetLevel(7); // Fun 8
const L3 = T.state.level;
const solAt8 = (x, y) => x < 0 || y < 0 || x >= L3.W || y >= L3.H ? 0 : L3.solid[y * L3.W + x];
let wallSpot = null;
for (let x = 20; x < L3.W - 20 && !wallSpot; x++) {
  for (let y = 20; y < L3.H - 10 && !wallSpot; y++) {
    let h = 0;
    while (y + h < L3.H && solAt8(x, y + h) && h < 40) h++;
    if (h >= 12 && !solAt8(x - 1, y + 4) && solAt8(x - 2, y + 6)) wallSpot = { x, y };
  }
}
let bashed = false;
if (wallSpot) {
  for (let t = 0; t < 4000 && !bashed; t++) {
    T.stepSim(L3);
    const lem = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk');
    if (lem) {
      lem.x = wallSpot.x - 2; lem.y = wallSpot.y + 3; lem.dir = 1;
      bashed = T.assignSkill(L3, lem, 5);
    }
  }
}
console.log('basher engaged:', bashed, 'at wall', JSON.stringify(wallSpot));
if (bashed) {
  const before = L3.solid.reduce((a, b) => a + b, 0);
  for (let t = 0; t < 600; t++) T.stepSim(L3);
  const after = L3.solid.reduce((a, b) => a + b, 0);
  console.log('basher test: solid', before, '->', after);
  if (after >= before) fail('basher did not remove terrain');
} else fail('no wall found on Fun8');

// ---- 3. builder bridges: build while a lemming walks on Fun 8 ----
T.resetLevel(7);
const L0b = T.state.level;
let bb = null;
for (let t = 0; t < 3000 && !bb; t++) {
  T.stepSim(L0b);
  bb = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk');
}
if (bb) {
  const bbefore = L0b.solid.reduce((a, b) => a + b, 0);
  const ok = T.assignSkill(L0b, bb, 4); // builder
  for (let t = 0; t < 500; t++) T.stepSim(L0b);
  const bafter = L0b.solid.reduce((a, b) => a + b, 0);
  console.log('builder test: solid', bbefore, '->', bafter, 'assigned', ok);
  if (!ok || bafter <= bbefore) fail('builder did not add terrain');
} else fail('no walking lemming on Fun8');

// ---- 4. digger does not throw, spends skills ----
T.resetLevel(0); // Fun 1
const L4 = T.state.level;
const solAt = (x, y) => x < 0 || y < 0 || x >= L4.W || y >= L4.H ? 0 : L4.solid[y * L4.W + x];
let dug = false;
for (let t = 0; t < 6000 && !dug; t++) {
  T.stepSim(L4);
  const lem = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk' &&
    solAt(Math.round(l.x) + 4, Math.round(l.y) + 1) && solAt(Math.round(l.x) - 4, Math.round(l.y) + 1));
  if (lem) { dug = T.assignSkill(L4, lem, 7); }
}
console.log('digger assigned on Fun1:', dug, 'skills left:', L4.skills[7]);
if (!dug) fail('no walker to dig on Fun1');
if (dug) {
  const before = L4.solid.reduce((a, b) => a + b, 0);
  for (let t = 0; t < 800; t++) T.stepSim(L4);
  const after = L4.solid.reduce((a, b) => a + b, 0);
  console.log('digger test: solid', before, '->', after);
  if (after >= before) fail('digger did not remove terrain');
}

// ---- 5. nuke kills all ----
T.resetLevel(0);
const L5 = T.state.level;
for (let t = 0; t < 400 && T.state.lems.length < 5; t++) T.stepSim(L5);
T.state.pending = 0; // no further spawns
T.nukeAll(L5);
let alive0 = T.state.lems.filter(l => !l.dead && !l.rescued).length;
for (let t = 0; t < 400 && !T.state.over; t++) T.stepSim(L5);
let alive1 = T.state.lems.filter(l => !l.dead && !l.rescued).length;
console.log('nuke test: alive', alive0, '->', alive1, 'over=', T.state.over);
if (alive1 !== 0) fail('nuke did not kill everything');
const fused = T.state.lems.filter(l => l.dead || l.rescued || l.explosionTimer > 0 || l.state === 'explode').length;
if (fused !== T.state.lems.length) fail('nuke missed ' + (T.state.lems.length - fused) + ' lemmings');

// ---- 6. Fun 7 (menu level 6): 20 builders only - authentic DOS route must win ----
// Floor -> 12px wall at x722 -> mesa steps -> plateau y96 -> pit x973..991 -> exit.
// One builder started before the wall scales it; one started just before the
// pit bridges it; everyone else follows the stairs/bridge.
T.resetLevel(6);
const L6 = T.state.level;
let phase = 1;
for (let t = 0; t < 20000 && !T.state.over; t++) {
  T.stepSim(L6);
  for (const lem of T.state.lems) {
    if (lem.dead || lem.rescued || lem.state !== 'walk' || lem.dir <= 0) continue;
    const x = Math.round(lem.x), y = Math.round(lem.y);
    if (phase === 1 && x >= 694 && x <= 710 && y >= 125) {
      if (T.assignSkill(L6, lem, 4)) phase = 2;
    } else if (phase === 2 && x >= 964 && x <= 971 && y >= 94 && y <= 97) {
      if (T.assignSkill(L6, lem, 4)) phase = 3;
    }
  }
}
console.log('Fun7 route: over=' + T.state.over + ' rescued=' + T.state.rescued
  + ' builders left=' + L6.skills[4]);
if (T.state.over !== 'win') fail('Fun7 builder route did not win: ' + T.state.over);

console.log(fails === 0 ? 'ENGINE TESTS PASS' : `ENGINE TESTS FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
