const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'build', 'assets.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'));
const T = window._lemTest;

// 1. object animation fields now populated?
T.resetSection(0);
const L = T.state.level;
for (const o of L.anims) {
  console.log('sec0 anim id=' + o.id, 'fr=' + o.fr, 'start=' + o.start, 'anim=' + o.anim);
}

// 2. continuous frame sequence now cycles?
const cont = L.anims.find(o => o.anim === 2);
if (cont) {
  const seq = [];
  for (let t = 0; t < 30; t++) {
    T.stepSim(L);
    seq.push(((cont.start || 0) + T.state.tick) % Math.max(1, cont.fr));
  }
  console.log('continuous frames:', [...new Set(seq)].sort((a, b) => a - b).join(','), '(distinct of', cont.fr + ')');
}

// 3. trap snd wired?
let trapWithSound = null;
for (let s = 0; s < 80 && !trapWithSound; s++) {
  T.resetSection(s);
  for (const o of T.state.level.anims) {
    if (o.anim === 1 && o.ob && o.ob.snd) { trapWithSound = { sec: s, id: o.id, snd: o.ob.snd }; break; }
  }
}
console.log('trap with sound byte:', JSON.stringify(trapWithSound));

// 4. basher stays level in own tunnel (Fun 8 = menu 7, same env as test_skills)
T.resetLevel(7);
const sol = (x, y) => x < 0 || y < 0 || x >= T.state.level.W || y >= T.state.level.H ? 0 : T.state.level.solid[y * T.state.level.W + x];
let spot = null;
for (let x = 20; x < T.state.level.W - 40 && !spot; x++) {
  for (let y = 20; y < T.state.level.H - 10 && !spot; y++) {
    let h = 0;
    while (y + h < T.state.level.H && sol(x, y + h) && h < 40) h++;
    if (h >= 12 && !sol(x - 1, y + 4) && sol(x - 2, y + 6)) spot = { x, y };
  }
}
let b = null;
for (let t = 0; t < 3000 && !b; t++) { T.stepSim(T.state.level); b = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk'); }
b.x = spot.x - 2; b.y = spot.y + 3; b.dir = 1;
T.assignSkill(T.state.level, b, 5);
const y0 = Math.round(b.y);
let maxDip = 0, dugPx = 0;
const before = T.state.level.solid.reduce((a, c) => a + c, 0);
for (let t = 0; t < 400; t++) {
  T.stepSim(T.state.level);
  if (b.dead || b.state !== 'bash') break;
  const d = Math.round(b.y) - y0;
  if (d > maxDip) maxDip = d;
}
const after = T.state.level.solid.reduce((a, c) => a + c, 0);
dugPx = before - after;
console.log('basher: max vertical dip =', maxDip, 'px (want <= ~1), terrain removed =', dugPx, ', state=' + b.state);

// 5. miner still descends continuously (regression check from last fix)
T.resetSection(7);
const L2 = () => T.state.level;
const sol2 = (x, y) => x < 0 || y < 0 || x >= L2().W || y >= L2().H ? 0 : L2().solid[y * L2().W + x];
let mspot = null;
for (let x = 100; x < L2().W - 120 && !mspot; x += 8) {
  for (let y = 60; y < L2().H - 30 && !mspot; y++) {
    if (sol2(x, y - 1)) continue;
    let ok = true;
    for (let dx = -48; dx <= 48 && ok; dx++) {
      if (!sol2(x + dx, y)) { ok = false; break; }
      let d = 0;
      while (d < 22 && sol2(x + dx, y + d)) d++;
      if (d < 20) ok = false;
    }
    if (ok) mspot = { x, y };
  }
}
let m = null;
for (let t = 0; t < 3000 && !m; t++) { T.stepSim(L2()); m = T.state.lems.find(l => !l.dead && !l.rescued && l.state === 'walk'); }
m.x = mspot.x; m.y = mspot.y - 1; m.dir = 1;
T.assignSkill(L2(), m, 6);
let swings = 0, lastF = -1, leftMine = null;
for (let t = 0; t < 500; t++) {
  T.stepSim(L2());
  if (m.dead) break;
  if (m.state === 'mine') {
    if (m.frame % 24 === 2 && lastF !== 2) swings++;
    lastF = m.frame % 24;
  } else if (m.state !== 'fall') { leftMine = m.state; break; }
}
console.log('miner: completed', swings, 'swing cycles, exited via:', leftMine || 'still mining/dead');
