
(() => {
'use strict';

/* ---------------- utilities ---------------- */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const lerp = (a, b, t) => a + (b - a) * t;
function turnToward(a, b, max) {
  const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + clamp(d, -max, max);
}
const $ = id => document.getElementById(id);

/* ---------------- state ---------------- */
const cells = [], motes = [], fx = [];
let snow = [];
let simTime = 0, running = false, speedMul = 1, started = false;
let flash = 0, foodMul = 1, maxGen = 0, statTimer = 0.5, snowAcc = 0;
let nextGenMilestone = 10, firstPredatorSeen = false, domLineage = -1, domCooldown = 0;
let reseedTimer = -1, pop150 = false, pop250 = false, nearExt = false;
let rainT = 45, raining = 0;
const stats = { births: 0, deaths: 0, landfalls: 0 };
let cid = 0;
const MAX_CELLS = 340, MAX_MOTES = 760;
const popHistory = [];

/* ------------- the oxygen economy -------------
   Photosynthesis keeps a baseline even when grazers strip the floating
   algae (benthic mats + dissolved organics), otherwise a healthy
   herbivore population pins O2 at zero and blocks all evolution. */
let o2 = 0.012, nutrientPool = 0;
const O2_PROD = 0.02, O2_PROD_PLANTS = 130, O2_RESP = 0.000022;
const TIER_O2  = [0, 0.08, 0.25, 0.45, 0.55, 0.6];
const TIER_GEN = [0, 6, 14, 24, 34, 48];
let anoxiaLogged = false, amnionSeen = false, warmSeen = false;

/* ---------------- body-plan tiers ---------------- */
const TIER_MIN_SIZE = [2.6, 4.5, 6.5, 9, 10.5, 12];
const TIER_SPEED = [1, .88, .82, .6, .72, .78];
const TIER_MSG = [
  null,
  'Endosymbiosis — a cell swallows a bacterium and keeps it. The first eukaryotes: nucleated, hungry, big.',
  'The Cambrian explosion — sleek swimmers with tail fins and eye-spots, and teeth to match.',
  'Armored crawlers patrol the shallows — twelve legs, twin eyes, too large for anyone to swallow.',
  'The Therapsids — upright gait, hair over leathery skin. Some burn fuel just to stay warm.',
  'The Mammals — live birth, milk, and oversized brains. Young are carried, not abandoned.'
];
const tierSeen = [false, false, false, false, false, false];

/* ---------------- geological clock ---------------- */
const EPOCHS = [
  { ga: 3.8,  name: 'Hadean shore',   stay: 35,  msg: null },
  { ga: 2.45, name: 'Archean',        stay: 70,  msg: 'Great Oxidation Event — photosynthesis poisons the sky with oxygen, and iron rusts out of the sea.', trig: () => o2 >= 0.08 },
  { ga: 1.6,  name: 'Proterozoic',    stay: 80,  msg: 'The Proterozoic — a billion quiet years of single cells sizing each other up.', trig: () => tierSeen[1] },
  { ga: 0.54, name: 'Cambrian',       stay: 60,  msg: 'The Cambrian — eyes, guts, and hunger everywhere at once.', trig: () => tierSeen[2] },
  { ga: 0.42, name: 'Silurian',       stay: 45,  msg: 'The Silurian — the shallows grow crowded, and the shore starts to look like food.', trig: () => tierSeen[3] },
  { ga: 0.385,name: 'Devonian',       stay: 70,  msg: 'The Devonian — the age of fishes, eyeing the dry land.', trig: () => stats.landfalls > 0 },
  { ga: 0.31, name: 'Carboniferous',  stay: 90,  msg: 'The Carboniferous — green things beyond the waterline, waiting to be eaten.', trig: () => amnionSeen },
  /* post-Carboniferous triggers are once-ever flags (tierSeen/warmSeen) or
     cumulative counters — regressing thresholds stalled the timeline forever */
  { ga: 0.299,name: 'Permian',        stay: 60,  msg: 'The Permian — synapsid hunters with an upright gait claim the sand.', trig: () => tierSeen[4] },
  { ga: 0.252,name: 'Triassic',       stay: 70,  msg: 'The Triassic — hair appears, and with it the first warm blood.', trig: () => warmSeen },
  { ga: 0.201,name: 'Jurassic',       stay: 90,  msg: 'The Jurassic — great lizards stalk the shores while small furred things nurse live young in the ferns.', trig: () => tierSeen[5] },
  { ga: 0.066,name: 'Cenozoic',       stay: 70,  msg: 'The Cenozoic — the great lizards are gone; the mammals radiate into every shape.', trig: () => stats.births >= 5000 },
  { ga: 0.0001,name:'Present day',    stay: 999, msg: 'Today — the pond is still there. It never really stopped.', trig: () => stats.births >= 10000 },
];
let epIdx = 0, epT = 0, gaShown = 3.8;
const epochEl = $('epoch');
function epochUpdate() {
  while (epIdx < EPOCHS.length - 1) {
    const nxt = EPOCHS[epIdx + 1];
    if (nxt.trig && nxt.trig() && simTime - epT > 6) {
      epIdx++; epT = simTime;
      if (EPOCHS[epIdx].msg) log(EPOCHS[epIdx].msg, true);
    } else break;
  }
  const e = EPOCHS[epIdx], nxt = EPOCHS[Math.min(epIdx + 1, EPOCHS.length - 1)];
  const targetGa = epIdx === EPOCHS.length - 1 ? e.ga - 0.05 : nxt.ga;
  gaShown = Math.max(targetGa, e.ga - (e.ga - targetGa) * clamp((simTime - epT) / (e.stay * 10), 0, 1));
  epochEl.innerHTML = e.name + '<small>' + gaShown.toFixed(3).replace(/0+$/,'').replace(/\.$/,'') + ' billion years ago</small>';
}

/* ---------------- canvas / world geometry ---------------- */
const cv = $('world'), ctx = cv.getContext('2d');
let W = 0, H = 0, CX = 0, CY = 0, R = 200, BEACH = 95;
let vents = [], sandTile = null, waterGrad = null, dryGrad = null;

function buildVents() {
  const old = vents;
  vents = [];
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * (0.34 + 0.32 * i / 2);
    /* preserve each vent's rate across resizes — a window drag must not
       silently re-roll the food economy */
    const p = old[i];
    vents.push({ x: CX + Math.cos(a) * R * 0.84, y: CY + Math.sin(a) * R * 0.84,
                 rate: p ? p.rate : rand(4.5, 6.5), acc: p ? p.acc : rand(0, 1) });
  }
}
function makeSand() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0e0c08'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const l = 14 + Math.random() * 16;
    g.fillStyle = `hsla(${38 + Math.random() * 14},${18 + Math.random() * 14}%,${l}%,${.25 + Math.random() * .4})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random(), 1);
  }
  sandTile = ctx.createPattern(c, 'repeat');
}
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CX = W / 2; CY = H / 2 + H * 0.03; R = Math.min(W, H) * 0.42;
  BEACH = Math.max(70, Math.min(W, H) * 0.14);
  buildVents(); makeSand();
  waterGrad = ctx.createRadialGradient(CX, CY - R * .25, R * .1, CX, CY, R);
  waterGrad.addColorStop(0, '#0a161b'); waterGrad.addColorStop(.75, '#071014'); waterGrad.addColorStop(1, '#050b0e');
  dryGrad = ctx.createRadialGradient(CX, CY, R, CX, CY, R + BEACH * 3);
  dryGrad.addColorStop(0, 'rgba(6,5,3,.18)');
  dryGrad.addColorStop(.4, 'rgba(5,4,2,.5)');
  dryGrad.addColorStop(1, 'rgba(4,3,2,.82)');
  for (const c of cells) pullIn(c.x, c.y, c, 10);
  for (const m of motes) pullIn(m.x, m.y, m, 5);
}
function pullIn(x, y, o, margin) {
  const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy) || 1, lim = R - margin;
  if (d > lim) { const k = lim / d; o.x = CX + dx * k; o.y = CY + dy * k; }
}
function randomInDish(f = 0.9) {
  const a = rand(0, TAU), r = Math.sqrt(Math.random()) * R * f;
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
}
const inDish = (x, y, m = 0) => Math.hypot(x - CX, y - CY) < R - m;
const distC = (x, y) => Math.hypot(x - CX, y - CY);

const flowX = (x, y, t) => Math.sin(x * 0.004 + t * 0.21) * 10 + Math.sin(y * 0.003 - t * 0.13 + 1.7) * 6;
const flowY = (x, y, t) => Math.sin(y * 0.0035 - t * 0.17) * 10 + Math.cos(x * 0.003 + t * 0.12 + 0.6) * 6 - 2;

/* ---------------- pre-rendered sprites ---------------- */
const spriteMemo = new Map();
function glowSprite(hue) {
  const key = 'g' + (hue / 10 | 0);
  let s = spriteMemo.get(key); if (s) return s;
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(S/2, S/2, 2, S/2, S/2, S/2);
  rg.addColorStop(0, `hsla(${hue},90%,66%,.55)`);
  rg.addColorStop(.35, `hsla(${hue},85%,55%,.20)`);
  rg.addColorStop(1, `hsla(${hue},85%,50%,0)`);
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  spriteMemo.set(key, c); return c;
}
function dotSprite(hue, light) {
  const key = 'd' + hue + '_' + light;
  let s = spriteMemo.get(key); if (s) return s;
  const S = 24, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
  rg.addColorStop(0, `hsla(${hue},80%,${light + 20}%,.95)`);
  rg.addColorStop(.3, `hsla(${hue},75%,${light}%,.5)`);
  rg.addColorStop(1, `hsla(${hue},75%,${light}%,0)`);
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  spriteMemo.set(key, c); return c;
}
const ALGAE_SPR = () => dotSprite(130, 60), MEAT_SPR = () => dotSprite(8, 56), WRACK_SPR = () => dotSprite(72, 36);

/* ---------------- genetics ---------------- */
function founderDNA() {
  return { size: rand(4, 6), speed: rand(45, 65), sense: rand(45, 75),
           diet: 0.02 + Math.random() * 0.05, lifespan: rand(80, 130),
           hue: rand(85, 175), tier: 0, amnion: false, warm: false };
}
function mutate(d, upChance, landBirth, pressure = 0) {
  const m = (v, r, lo, hi) => clamp(v * (1 + gauss() * r), lo, hi);
  let diet = d.diet + gauss() * 0.05;
  /* dietary leaps follow the parent's recent menu: a lineage that actually
     ate meat leans carnivorous, plant-grazers barely drift. A one-way ratchet
     toward carnivorism collapses the food web and freezes evolution. */
  if (Math.random() < 0.03 + pressure * 0.2)
    diet += (Math.random() < .5 + pressure * .45 ? 1 : -1) * rand(.08, .22);
  let tier = d.tier;
  if (d.tier < 5 && Math.random() < upChance) tier++;
  /* endothermy is rare, appears only in therapsid-grade lineages, and once it
     appears it never disappears — but warm blood is a prerequisite for the
     mammalian body plan, not a free rider on it */
  let warm = !!d.warm;
  if (!warm && tier >= 4 && Math.random() < 0.25) warm = true;
  else if (tier === 5 && !warm) { tier = 4; if (Math.random() < 0.4) warm = true; }
  let amnion = d.amnion;
  if (!amnion && landBirth && d.tier === 3 && o2 >= 0.45 && Math.random() < 0.06) amnion = true;
  return {
    size: Math.max(m(d.size, 0.09, 2.6, 16), TIER_MIN_SIZE[tier]),
    speed: m(d.speed, 0.09, 14, 150),
    sense: m(d.sense, 0.09, 18, 150),
    diet: clamp(diet, 0, 1),
    lifespan: m(d.lifespan, 0.07, 45, 220),
    hue: (d.hue + gauss() * 9 + 360) % 360,
    tier, amnion, warm
  };
}
function addCell(x, y, dna, gen, energy) {
  if (cells.length >= MAX_CELLS) return null;
  const c = { id: ++cid, x, y, vx: 0, vy: 0, heading: rand(0, TAU), energy,
    dna, gen, age: 0, born: simTime, decide: rand(0, .2), tgt: null,
    tailP: rand(0, TAU), dead: false, shore: false,
    maxE: (150 + dna.size * 15) * (1 + dna.tier * 0.4) };
  cells.push(c); return c;
}
function spawnMote(x, y, type, e, vx = 0, vy = 0) {
  if (motes.length >= MAX_MOTES) return;
  motes.push({ x, y, vx, vy, type, e, life: type === 'wrack' ? rand(35, 60) : rand(20, 30), age: 0 });
}
function emitVent(v) {
  const a = rand(-0.55, 0.55);
  spawnMote(v.x + rand(-14, 14), v.y + rand(-6, 6), 'plant', rand(12, 18),
            Math.sin(a) * rand(6, 16), -rand(14, 30));
}
function beachMote(m, nx, ny) {
  m.type = 'wrack'; m.e = rand(14, 22); m.age = 0; m.life = rand(35, 60);
  const d = R + rand(10, BEACH * 0.85);
  m.x = CX + nx * d; m.y = CY + ny * d; m.vx = m.vy = 0;
}

/* ---------------- spatial hash ---------------- */
const GRID = 72, moteGrid = new Map(), cellGrid = new Map();
function gridInsert(map, o) {
  const k = (((o.x / GRID) | 0) + 64) * 4096 + (((o.y / GRID) | 0) + 64);
  const a = map.get(k); if (a) a.push(o); else map.set(k, [o]);
}
function buildGrids() {
  moteGrid.clear(); cellGrid.clear();
  for (const m of motes) if (!m.eaten) gridInsert(moteGrid, m);
  for (const c of cells) if (!c.dead) gridInsert(cellGrid, c);
}
function forNear(map, x, y, rad, fn) {
  const x0 = ((x - rad) / GRID) | 0, x1 = ((x + rad) / GRID) | 0;
  const y0 = ((y - rad) / GRID) | 0, y1 = ((y + rad) / GRID) | 0;
  for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
    const a = map.get((gx + 64) * 4096 + (gy + 64));
    if (a) for (let i = 0; i < a.length; i++) fn(a[i]);
  }
}

/* ---------------- behaviour ---------------- */
function chooseTarget(c, land) {
  const d = c.dna;
  /* big brains: mammal-grade lineages sense farther */
  const sense = d.sense * (1 + d.tier * 0.12) * (d.tier >= 5 ? 1.3 : 1);
  const s2 = sense * sense;
  let threat = null, td = 1e18;
  forNear(cellGrid, c.x, c.y, sense, o => {
    if (o === c || o.dead || o.dna.diet < 0.4 || o.dna.size < d.size * 1.15) return;
    if ((distC(o.x, o.y) >= R) !== land) return;
    const dd = (o.x - c.x) ** 2 + (o.y - c.y) ** 2;
    if (dd < td) { td = dd; threat = o; }
  });
  if (threat && td < s2 * 1.4) { c.tgt = { t: 'flee', ref: threat }; return; }
  if (d.diet > 0.5) {
    let prey = null, pd = 1e18;
    forNear(cellGrid, c.x, c.y, sense, o => {
      if (o === c || o.dead || o.dna.size > d.size * 0.85) return;
      if ((distC(o.x, o.y) >= R) !== land) return;
      const dd = (o.x - c.x) ** 2 + (o.y - c.y) ** 2;
      if (dd < pd) { pd = dd; prey = o; }
    });
    if (prey) { c.tgt = { t: 'prey', ref: prey }; return; }
  }
  const wantMeat = d.diet > 0.45;
  let best = null, bs = 1e18;
  forNear(moteGrid, c.x, c.y, sense, m => {
    if (m.eaten) return;
    if (land !== (m.type === 'wrack')) return;
    const dd = (m.x - c.x) ** 2 + (m.y - c.y) ** 2;
    const sc = dd * (m.type === (wantMeat ? 'meat' : 'plant') ? 1 : 5);
    if (sc < bs) { bs = sc; best = m; }
  });
  c.tgt = best ? { t: 'mote', ref: best } : null;
}

const reproCost = c => (55 + c.dna.size * 9) * (1 + c.dna.tier * 0.35);
const metabBase = c => 0.05 + 0.0022 * Math.pow(c.dna.size, 2.25);
function hypoxic(c) {
  /* warm-blooded bodies demand more oxygen before they feel the pinch */
  return c.dna.tier > 0 && o2 < TIER_O2[c.dna.tier] * (c.dna.warm ? .75 : .5);
}

function birthBookkeeping(parent, child) {
  stats.births++;
  if (child.dna.amnion && !amnionSeen) {
    amnionSeen = true;
    log('THE AMNIOTIC EGG — a private pond, folded inside a shell. This lineage will never need the water again.', true);
  }
  if (child.dna.warm && !warmSeen) {
    warmSeen = true;
    log('ENDOTHERMY — a lineage burns fuel to heat itself from within. Fur follows, and the dry night becomes habitable.', true);
  }
  fx.push({ k: 'ring', x: child.x, y: child.y, r: 8, spd: 30, a: .5, da: 1.5, hue: parent.dna.hue });
  if (parent.gen + 1 > maxGen) maxGen = parent.gen + 1;
}

function madeLandfall(c) {
  stats.landfalls++;
  c.shore = false;
  fx.push({ k: 'ring', x: c.x, y: c.y, r: c.dna.size, spd: 50, a: .6, da: 1.2, hue: c.dna.hue });
  if (stats.landfalls === 1) {
    log(`LANDFALL — after ${c.gen} generations, a crawler hauls itself out of the water and onto the sand.`, true);
  } else if (stats.landfalls % 5 === 0) {
    log(`Another lineage takes the shore (${stats.landfalls} landfalls so far).`);
  }
}

function kill(c, cause) {
  if (c.dead) return;
  c.dead = true; stats.deaths++;
  if (cause === 'impact' || cause === 'eaten') {
    fx.push({ k: 'pop', x: c.x, y: c.y, r: c.dna.size, a: .7, da: 2.4, hue: cause === 'eaten' ? c.dna.hue : 30 });
    return;
  }
  const n = clamp(Math.round(c.dna.size / 2.4), 2, 9);
  const onLand = distC(c.x, c.y) >= R;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(4, 18);
    spawnMote(c.x + Math.cos(a) * c.dna.size * .5, c.y + Math.sin(a) * c.dna.size * .5,
              onLand ? 'wrack' : 'meat', 4 + c.dna.size * 1.1, Math.cos(a) * sp, Math.sin(a) * sp);
  }
  fx.push({ k: 'pop', x: c.x, y: c.y, r: c.dna.size, a: .8, da: 1.8, hue: c.dna.hue });
}

/* ---------------- cell update ---------------- */
function updateCell(c, dt) {
  const d = c.dna;
  c.age += dt;
  if (c.age > d.lifespan || c.energy <= 0) { kill(c, c.energy <= 0 ? 'starved' : 'age'); return; }

  const spd01 = clamp(d.speed / 90, .2, 1.6);
  const hyp = hypoxic(c);
  /* endothermy: ~1.6x the fuel bill, paid for with speed and dry-skin immunity */
  c.energy -= (metabBase(c) + d.sense * .0026 + spd01 * spd01 * .32 + d.tier * .15)
            * (d.warm ? 1.6 : 1) * (hyp ? 1.7 : 1) * dt;

  if (c.shore && distC(c.x, c.y) >= R + 2) madeLandfall(c);

  const land = distC(c.x, c.y) >= R;
  if (!land) updateWater(c, dt, hyp);
  else updateLand(c, dt, hyp);
}

function updateWater(c, dt, hyp) {
  const d = c.dna;
  if (d.tier >= 3 && !c.shore && c.age > d.lifespan * .5 && c.energy > c.maxE * .6) c.shore = true;

  if (c.shore) {
    c.tgt = null;
    c.heading = turnToward(c.heading, Math.atan2(c.y - CY, c.x - CX) + Math.sin(simTime * 2 + c.id) * .3, 2.5 * dt);
  } else {
    c.decide -= dt;
    if (c.decide <= 0) { c.decide = rand(.15, .3); chooseTarget(c, false); }
  }

  const t = c.tgt;
  if (t && t.ref.dead !== undefined && t.ref.dead) c.tgt = null;
  if (t && t.ref.eaten !== undefined && t.ref.eaten) c.tgt = null;
  let thrust = 1;
  if (c.tgt) {
    const o = c.tgt.ref;
    let ax, ay;
    if (c.tgt.t === 'flee') { ax = c.x - o.x; ay = c.y - o.y; thrust = 1.15; }
    else { ax = o.x - c.x; ay = o.y - c.y; }
    c.heading = turnToward(c.heading, Math.atan2(ay, ax), 5 * dt * (c.tgt.t === 'flee' ? 1.6 : 1));
  } else if (!c.shore) {
    c.heading += gauss() * 2.4 * dt;
  }

  const spd = d.speed * TIER_SPEED[d.tier] * thrust * (d.warm ? 1.15 : 1)
            * (c.energy < 18 ? .55 : 1) * (hyp ? .75 : 1);
  const k = 1 - Math.exp(-3 * dt);
  c.vx = lerp(c.vx, Math.cos(c.heading) * spd, k);
  c.vy = lerp(c.vy, Math.sin(c.heading) * spd, k);

  const drift = clamp(6 / d.size, .15, 1);
  c.vx += flowX(c.x, c.y, simTime) * drift * dt;
  c.vy += flowY(c.x, c.y, simTime) * drift * dt;
  c.x += c.vx * dt; c.y += c.vy * dt;

  if (!c.shore) {
    const bx = c.x - CX, by = c.y - CY, bd = Math.hypot(bx, by), lim = R - d.size - 4;
    if (bd > lim) {
      const nx = bx / bd, ny = by / bd;
      c.x = CX + nx * lim; c.y = CY + ny * lim;
      const dot = c.vx * nx + c.vy * ny;
      if (dot > 0) { c.vx -= 1.7 * dot * nx; c.vy -= 1.7 * dot * ny; }
      c.heading = Math.atan2(c.vy, c.vx);
    }
  }
  c.tailP += dt * (3 + Math.hypot(c.vx, c.vy) * .12);

  graze(c, false);
  contact(c, dt, false);

  if (!c.shore && c.energy > reproCost(c) * 1.5 && c.age > 3) {
    const cost = reproCost(c);
    c.energy -= cost;
    const upOk = d.tier < 5 && o2 >= TIER_O2[d.tier + 1] && c.gen >= TIER_GEN[d.tier + 1];
    const child = addCell(c.x + rand(-6, 6), c.y + rand(-6, 6),
                          mutate(d, upOk ? (d.tier >= 3 ? 0.12 : 0.18) : 0, false, c.meatFrac || 0), c.gen + 1, cost * .7);
    if (child) birthBookkeeping(c, child); else c.energy += cost * .5;
  }
}

function updateLand(c, dt, hyp) {
  const d = c.dna;
  const dc = distC(c.x, c.y);

  const dry = Math.max(0, dc - R - BEACH) * 0.004
            * (d.amnion ? 0.35 : 1) * (d.warm ? 0.45 : 1) * (raining > 0 ? 0.15 : 1);
  c.energy -= dry * dt;

  c.decide -= dt;
  const eggRun = !d.amnion && c.energy > reproCost(c) * 1.35;
  let thrust = .7;

  if (eggRun) {
    c.tgt = null;
    c.heading = turnToward(c.heading, Math.atan2(CY - c.y, CX - c.x), 3 * dt);
    thrust = 1;
    if (dc < R + 30) {
      const cost = reproCost(c); c.energy -= cost;
      const nx = (c.x - CX) / dc, ny = (c.y - CY) / dc;
      const upOk = d.tier < 5 && o2 >= TIER_O2[d.tier + 1] && c.gen >= TIER_GEN[d.tier + 1];
      const child = addCell(CX + nx * (R - 24), CY + ny * (R - 24),
                            mutate(d, upOk ? (d.tier >= 3 ? 0.12 : 0.18) : 0, true, c.meatFrac || 0), c.gen + 1, cost * .7);
      if (child) birthBookkeeping(c, child); else c.energy += cost * .5;
      return;
    }
  } else {
    if (c.decide <= 0) { c.decide = rand(.15, .3); chooseTarget(c, true); }
    const t = c.tgt;
    if (t && t.ref.dead !== undefined && t.ref.dead) c.tgt = null;
    if (t && t.ref.eaten !== undefined && t.ref.eaten) c.tgt = null;
    if (c.tgt) {
      const o = c.tgt.ref;
      let ax = o.x - c.x, ay = o.y - c.y;
      if (c.tgt.t === 'flee') { ax = -ax; ay = -ay; thrust = 1.15; } else thrust = 1;
      c.heading = turnToward(c.heading, Math.atan2(ay, ax), 5 * dt);
    } else {
      const outward = Math.atan2(c.y - CY, c.x - CX);
      const roam = d.amnion && raining <= 0 ? outward + gauss() * 1.4
                                         : outward + (c.id % 2 ? 1.5 : -1.5) + gauss() * .7;
      c.heading = turnToward(c.heading, roam, 1.6 * dt);
    }
  }

  const spd = d.speed * TIER_SPEED[d.tier] * thrust * 0.42 * (d.warm ? 1.2 : 1)
            * (c.energy < 18 ? .55 : 1) * (hyp ? .75 : 1);
  const k = 1 - Math.exp(-2.4 * dt);
  c.vx = lerp(c.vx, Math.cos(c.heading) * spd, k);
  c.vy = lerp(c.vy, Math.sin(c.heading) * spd, k);
  c.x += c.vx * dt; c.y += c.vy * dt;
  c.tailP += dt * (2 + Math.hypot(c.vx, c.vy) * .12);

  if (c.x < 12) { c.x = 12; c.heading = Math.PI - c.heading; }
  if (c.x > W - 12) { c.x = W - 12; c.heading = Math.PI - c.heading; }
  if (c.y < 12) { c.y = 12; c.heading = -c.heading; }
  if (c.y > H - 12) { c.y = H - 12; c.heading = -c.heading; }

  graze(c, true);
  contact(c, dt, true);

  /* amniotes breed on land; viviparous mammals skip the egg entirely —
     cheaper "gestation" and richer young (milk). Land upgrades happen here:
     terrestrial tiers must be able to evolve without returning to water. */
  const liveBirth = d.amnion;
  const gest = d.tier >= 5 ? 1.3 : 1.45;
  if (liveBirth && c.energy > reproCost(c) * gest && c.age > 4) {
    const cost = reproCost(c);
    c.energy -= cost;
    const upOk = d.tier < 5 && o2 >= TIER_O2[d.tier + 1] && c.gen >= TIER_GEN[d.tier + 1];
    const child = addCell(c.x + rand(-6, 6), c.y + rand(-6, 6),
                          mutate(d, upOk ? (d.tier >= 3 ? 0.12 : 0.18) : 0, true, c.meatFrac || 0),
                          c.gen + 1, cost * (d.tier >= 5 ? .8 : .7));
    if (child) birthBookkeeping(c, child); else c.energy += cost * .5;
  }
}

function graze(c, land) {
  const d = c.dna, r = d.size;
  forNear(moteGrid, c.x, c.y, r + 8, m => {
    if (m.eaten) return;
    if (land !== (m.type === 'wrack')) return;
    const dx = m.x - c.x, dy = m.y - c.y;
    if (dx * dx + dy * dy < (r + 3) * (r + 3)) {
      const gain = m.type === 'meat' ? m.e * (.25 + .85 * d.diet) : m.e * (1.15 - .85 * d.diet);
      m.eaten = true;
      c.meatFrac = (c.meatFrac || 0) * 0.92 + (m.type === 'meat' ? 0.08 : 0);
      c.energy = Math.min(c.maxE, c.energy + gain);
    }
  });
}

function contact(c, dt, land) {
  const d = c.dna;
  forNear(cellGrid, c.x, c.y, 34, o => {
    if (o === c || o.dead || o.id < c.id) return;
    if ((distC(o.x, o.y) >= R) !== land) return;
    const dx = o.x - c.x, dy = o.y - c.y, dd = Math.hypot(dx, dy) || .01;
    const overlap = d.size + o.dna.size - dd;
    if (overlap <= 0) return;
    let A = null, B = null;
    if (d.diet > .45 && d.size > o.dna.size * 1.12) { A = c; B = o; }
    else if (o.dna.diet > .45 && o.dna.size > d.size * 1.12) { A = o; B = c; }
    if (A) {
      if (A.dna.size > B.dna.size * 1.35 && dd < A.dna.size * 0.75 && !B.dead) {
        A.energy = Math.min(A.maxE, A.energy + B.energy * .35 + B.dna.size * 2.2);
        A.meatFrac = (A.meatFrac || 0) * 0.92 + 0.08;
        kill(B, 'eaten');
      } else if (!B.dead) {
        const take = Math.min(B.energy + 1, 26 * dt * A.dna.diet);
        if (take > 0) A.meatFrac = (A.meatFrac || 0) * 0.92 + 0.08;
        B.energy -= take;
        A.energy = Math.min(A.maxE, A.energy + take * .85 * A.dna.diet);
        if (!B.tgt || B.tgt.t !== 'flee') B.tgt = { t: 'flee', ref: A };
      }
    }
    if (B && B.dead) return;
    if (d.tier <= 1 && o.dna.tier <= 1 && Math.random() < 0.04 * dt) {
      const keys = ['speed', 'sense', 'diet', 'lifespan'];
      const key = keys[(Math.random() * keys.length) | 0];
      d[key] = o.dna[key];
    }
    const tot = d.size + o.dna.size, sep = overlap * 2.2 * dt;
    c.x -= dx / dd * sep * (o.dna.size / tot); c.y -= dy / dd * sep * (o.dna.size / tot);
    o.x += dx / dd * sep * (d.size / tot);     o.y += dy / dd * sep * (d.size / tot);
  });
}

/* ---------------- simulation step ---------------- */
function step(dt) {
  simTime += dt;
  if (foodMul < 1) foodMul = Math.min(1, foodMul + dt * 0.015);

  let plants = 0, resp = 0;
  for (const m of motes) if (m.type === 'plant' && !m.eaten) plants++;
  for (const c of cells) resp += O2_RESP * (1 + c.dna.tier * 1.2);
  /* baseline 0.55: benthic mats + dissolved organics photosynthesize even
     when grazers strip the floating algae — otherwise late-game respiration
     sinks O2 below the amnion gate permanently and time stops at the Devonian */
  o2 = clamp(o2 + (O2_PROD * (0.55 + 0.45 * Math.min(1, plants / O2_PROD_PLANTS)) - resp) * dt, 0.002, 1);

  for (const v of vents) { v.acc += v.rate * foodMul * dt; while (v.acc >= 1) { v.acc--; emitVent(v); } }
  snowAcc += (2.5 + nutrientPool * 0.03) * foodMul * dt;
  while (snowAcc >= 1) { snowAcc--; const p = randomInDish(.95); spawnMote(p.x, p.y, 'plant', rand(10, 15), rand(-4, 4), rand(0, 5)); }

  if (raining > 0) {
    raining -= dt;
    if (Math.random() < 6 * dt) {
      const a = rand(0, TAU), d = R + rand(10, BEACH * 0.9);
      spawnMote(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 'wrack', rand(14, 22));
    }
  } else {
    rainT -= dt;
    if (rainT <= 0) { raining = 6; rainT = 35 + rand(0, 30); }
  }

  buildGrids();
  /* snapshot the length: cells born this step start next step, so newborns
     aren't double-updated and never iterate a growing array */
  const nCells = cells.length;
  for (let i = 0; i < nCells; i++) { const c = cells[i]; if (!c.dead) updateCell(c, dt); }

  /* THE FIX — single maintenance pass over all motes:
     eaten ones are REMOVED (they used to linger forever as inedible
     ghosts until the array filled and no food could ever spawn again);
     every mote ages, including wrack (which used to be immortal);
     expired carrion feeds the nutrient pool. */
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    if (m.eaten) { motes.splice(i, 1); continue; }
    m.age += dt;
    if (m.age > m.life) {
      if (m.type === 'meat') nutrientPool = Math.min(60, nutrientPool + m.e * 0.3);
      motes.splice(i, 1);
      continue;
    }
    if (m.type === 'wrack') continue; // stationary on the sand
    const k = 1 - Math.exp(-1.2 * dt);
    m.vx = lerp(m.vx, flowX(m.x, m.y, simTime) * .7, k);
    m.vy = lerp(m.vy, flowY(m.x, m.y, simTime) * .7, k);
    m.x += m.vx * dt; m.y += m.vy * dt;
    const bx = m.x - CX, by = m.y - CY, bd = Math.hypot(bx, by);
    if (bd > R - 6) {
      const k2 = (R - 6) / bd; m.x = CX + bx * k2; m.y = CY + by * k2; m.vx *= .5; m.vy *= .5;
      if (Math.random() < 0.08) beachMote(m, bx / bd, by / bd);
    }
  }
  for (let i = cells.length - 1; i >= 0; i--) if (cells[i].dead) cells.splice(i, 1);
  if (raining <= 0) nutrientPool = Math.max(0, nutrientPool - dt * 0.15);

  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.r += (f.spd || 26) * dt; f.a -= (f.da || 1.4) * dt; if (f.a <= 0) fx.splice(i, 1); }

  statTimer -= dt;
  /* widen the sampling interval at high speed — otherwise a single frame at
     1000× fires ~33 stat passes and the DOM panel becomes the bottleneck */
  if (statTimer <= 0) { statTimer = Math.max(.5, speedMul / 50); sampleStats(); }

  if (started && cells.length === 0) {
    if (reseedTimer < 0) reseedTimer = simTime + 9;
    else if (simTime >= reseedTimer) { reseedTimer = -1; abiogenesis('Deep in the chemistry, something copies itself again.'); }
  } else reseedTimer = -1;
}

/* ---------------- narration ---------------- */
const logEl = $('log');
function log(msg, major = false) {
  const d = document.createElement('div');
  d.className = 'entry' + (major ? ' major' : '');
  d.innerHTML = `<time>+${simTime | 0} Myr</time>${msg}`;
  logEl.prepend(d);
  while (logEl.children.length > 7) logEl.lastChild.remove();
}
function hueName(h) {
  const t = [[15,'crimson'],[38,'ember'],[60,'gold'],[85,'lime'],[140,'jade'],[172,'teal'],
             [200,'cyan'],[240,'azure'],[275,'indigo'],[295,'violet'],[325,'magenta'],[345,'rose'],[361,'crimson']];
  for (const [lim, name] of t) if (h < lim) return name;
  return 'crimson';
}
/* AUDIT FIX: founders used to spawn into an empty pond and had to survive
   a starvation sprint before the vents produced anything — seed food with
   them, and give them a bit more starting energy so recovery is real. */
function abiogenesis(msg) {
  const v = vents[(Math.random() * vents.length) | 0];
  for (let i = 0; i < 40; i++) {
    const a = rand(0, TAU), r = rand(0, 90);
    spawnMote(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r, 'plant', rand(12, 16), rand(-6, 6), rand(-6, 6));
  }
  for (let i = 0; i < 12; i++) {
    const a = rand(0, TAU), r = rand(0, 46);
    addCell(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r, founderDNA(), 1, 90);
  }
  maxGen = Math.max(maxGen, 1);
  if (msg) log(msg, true);
}
function impact() {
  if (!started || (!cells.length && !motes.length)) return;
  const a = rand(0, TAU), rr = rand(0, R * .55);
  const ix = CX + Math.cos(a) * rr, iy = CY + Math.sin(a) * rr;
  fx.push({ k: 'shock', x: ix, y: iy, r: 10, spd: 1000, a: .9, da: .8, hue: 30, w: 3 });
  flash = 1;
  let survivors = 0;
  for (const c of cells) {
    const survive = clamp(.03 + .35 * (Math.hypot(c.x - ix, c.y - iy) / R), .03, .38);
    if (Math.random() < survive) survivors++;
    else kill(c, 'impact');
  }
  for (let i = cells.length - 1; i >= 0; i--) if (cells[i].dead) cells.splice(i, 1);
  for (let i = motes.length - 1; i >= 0; i--) if (Math.random() < .85) motes.splice(i, 1);
  foodMul = 0.3;
  o2 = Math.max(0.004, o2 * 0.6);
  /* a rock during the age of reptiles deserves its own headline */
  const era = EPOCHS[epIdx].name;
  if (era === 'Triassic' || era === 'Jurassic') {
    log(`K-Pg — a rock falls out of the sky. ${survivors} cells endure. The great reptiles burn; the small and buried wait it out.`, true);
  } else {
    log(`Impact winter — a rock falls out of the sky. ${survivors} cells endure. The algae die back; the oxygen will not last.`, true);
  }
  nearExt = pop150 = pop250 = false; domCooldown = 0; anoxiaLogged = false;
  sampleStats();
}

/* ---------------- stats panel ---------------- */
const el = {};
['stPop','stSplit','stGen','stBD','stPred','stWarm','stLand','bO2','tO2','o2note','bSize','tSize',
 'bSpeed','tSpeed','bSense','tSense','bDiet','tDiet','spark','lineages'].forEach(id => el[id] = $(id));
const sctx = el.spark.getContext('2d'); sctx.setTransform(2, 0, 0, 2, 0, 0);

const linRows = [];
(function initLineages() {
  for (let i = 0; i < 3; i++) {
    const row = document.createElement('div'); row.className = 'lineage';
    row.innerHTML = '<span class="sw"></span><span class="nm">—</span><span class="pc"></span>';
    el.lineages.appendChild(row);
    linRows.push({ el: row, sw: row.children[0], nm: row.children[1], pc: row.children[2] });
  }
})();

function setTrait(bar, val, v, lo, hi, dec) {
  el[bar].style.width = (clamp((v - lo) / (hi - lo), 0, 1) * 100).toFixed(1) + '%';
  el[val].textContent = v.toFixed(dec);
}
function drawSpark() {
  const w = 196, h = 46;
  sctx.clearRect(0, 0, w, h);
  sctx.strokeStyle = 'rgba(232,223,201,.12)';
  sctx.beginPath(); sctx.moveTo(0, h - .5); sctx.lineTo(w, h - .5); sctx.stroke();
  if (popHistory.length < 2) return;
  let mx = 10; for (const v of popHistory) if (v > mx) mx = v;
  sctx.beginPath();
  for (let i = 0; i < popHistory.length; i++) {
    const x = i / (popHistory.length - 1) * w, y = h - 3 - popHistory[i] / mx * (h - 8);
    i ? sctx.lineTo(x, y) : sctx.moveTo(x, y);
  }
  sctx.strokeStyle = 'rgba(217,163,92,.9)'; sctx.lineWidth = 1.2; sctx.stroke();
  sctx.lineTo(w, h - 1); sctx.lineTo(0, h - 1); sctx.closePath();
  sctx.fillStyle = 'rgba(217,163,92,.10)'; sctx.fill();
}
function sampleStats() {
  const n = cells.length;
  popHistory.push(n); if (popHistory.length > 220) popHistory.shift();
  let aS = 0, aV = 0, aSe = 0, aD = 0, preds = 0, ashore = 0, warms = 0;
  const tiers = [0, 0, 0, 0, 0, 0];
  const hues = new Float32Array(36);
  for (const c of cells) {
    const d = c.dna; aS += d.size; aV += d.speed; aSe += d.sense; aD += d.diet;
    if (d.diet > .5) preds++;
    if (d.warm) warms++;
    if (distC(c.x, c.y) >= R) ashore++;
    tiers[d.tier]++;
    hues[Math.min(35, d.hue / 10 | 0)]++;
  }
  el.stPop.textContent = n;
  el.stSplit.textContent = (n - ashore) + ' / ' + ashore;
  el.stGen.textContent = maxGen;
  el.stBD.textContent = stats.births.toLocaleString() + ' · ' + stats.deaths.toLocaleString();
  el.stPred.textContent = preds;
  el.stWarm.textContent = warms;
  el.stLand.textContent = stats.landfalls;
  el.bO2.style.width = (o2 * 100).toFixed(1) + '%';
  el.tO2.textContent = Math.round(o2 * 100) + '% PAL';
  el.o2note.textContent = o2 < 0.08 ? 'a sky with no breath in it'
    : o2 < 0.25 ? 'enough for nucleated cells, no more'
    : o2 < 0.45 ? 'the deep water is starting to breathe'
    : o2 < 0.55 ? 'rich enough for armor and appetite'
    : 'an atmosphere worth walking into';
  if (n > 0) {
    setTrait('bSize', 'tSize', aS / n, 2.6, 15, 1);
    setTrait('bSpeed', 'tSpeed', aV / n, 14, 150, 0);
    setTrait('bSense', 'tSense', aSe / n, 18, 150, 0);
    setTrait('bDiet', 'tDiet', aD / n, 0, 1, 2);
  }
  drawSpark();

  const idx = [...Array(36).keys()].sort((a, b) => hues[b] - hues[a]).slice(0, 3);
  linRows.forEach((row, i) => {
    const b = idx[i], cnt = hues[b];
    if (n > 0 && cnt > 0) {
      const h = b * 10 + 5;
      row.sw.style.background = `hsl(${h},70%,60%)`;
      row.sw.style.boxShadow = `0 0 6px hsla(${h},80%,60%,.8)`;
      row.nm.textContent = hueName(h);
      row.pc.textContent = Math.round(cnt / n * 100) + '%';
      row.el.style.opacity = 1;
    } else { row.nm.textContent = '—'; row.pc.textContent = ''; row.el.style.opacity = .3; }
  });

  if (maxGen >= nextGenMilestone) { log(`Generation ${nextGenMilestone} reached.`); nextGenMilestone += 10; }
  if (!anoxiaLogged && o2 < 0.06 && tiers[2] + tiers[3] > 0) {
    anoxiaLogged = true;
    log('Anoxia spreads — the water forgets how to breathe, and the large suffocate first.', true);
  }
  if (!firstPredatorSeen && preds > 0) {
    firstPredatorSeen = true;
    const c = cells.find(c => c.dna.diet > .5);
    if (c) log(`Predation emerges — a ${hueName(c.dna.hue)} lineage turns carnivorous (gen ${c.gen}).`, true);
  }
  for (let t = 1; t <= 5; t++) {
    if (!tierSeen[t] && tiers[t] > 0) { tierSeen[t] = true; log(TIER_MSG[t], true); }
  }
  if (n > 150 && !pop150) { pop150 = true; log('The pond is crowded — 150 cells and counting.'); }
  if (n > 250 && !pop250) { pop250 = true; log('Two hundred fifty cells — the pond is boiling with life.', true); }
  if (n < 8 && !nearExt && stats.births > 20) { nearExt = true; log('Bottleneck — a handful of survivors. Drift now outweighs selection.'); }
  if (n > 25) nearExt = false;
  domCooldown -= .5;
  let bi = -1, bn = 0, tot = 0;
  for (let i = 0; i < 36; i++) { tot += hues[i]; if (hues[i] > bn) { bn = hues[i]; bi = i; } }
  if (tot > 30 && domCooldown <= 0 && bn / tot > .45 && bi !== domLineage) {
    domLineage = bi; domCooldown = 25;
    log(`The ${hueName(bi * 10 + 5)} lineage now rules the pond (${Math.round(bn / tot * 100)}% of all life).`, true);
  }
  epochUpdate();
}

/* ---------------- rendering ---------------- */
function drawCell(c) {
  const d = c.dna, r = d.size * clamp((simTime - c.born) / .6, .35, 1);
  const hue = d.hue | 0, eFrac = clamp(c.energy / c.maxE, 0, 1);
  const hyp = hypoxic(c);
  const gr = r * 5.5;
  ctx.globalAlpha = (.35 + .4 * eFrac) * (hyp ? .55 : 1);
  ctx.drawImage(glowSprite(hue), c.x - gr, c.y - gr, gr * 2, gr * 2);
  const hx = Math.cos(c.heading), hy = Math.sin(c.heading);
  const bodyL = t => `hsl(${hue},${t < 2 ? 60 : 45}%,${(hyp ? 24 : 32) + eFrac * 20}%)`;

  if (d.tier === 0) {
    const wag = .5 + Math.min(1.2, Math.hypot(c.vx, c.vy) / 60);
    ctx.beginPath();
    ctx.moveTo(c.x - hx * r, c.y - hy * r);
    for (let i = 1; i <= 7; i++) {
      const back = r + r * .75 * i;
      const off = Math.sin(c.tailP - i * .8) * (1 + i * .55) * wag;
      ctx.lineTo(c.x - hx * back - hy * off, c.y - hy * back + hx * off);
    }
    ctx.strokeStyle = `hsla(${hue},60%,70%,${(.28 + .3 * eFrac) * (hyp ? .5 : 1)})`;
    ctx.lineWidth = 1.1; ctx.stroke();
    if (d.diet > .45) {
      ctx.strokeStyle = `hsla(${hue},70%,72%,.7)`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU + c.tailP * .35, ca = Math.cos(a), sa = Math.sin(a);
        ctx.moveTo(c.x + ca * (r + 1), c.y + sa * (r + 1));
        ctx.lineTo(c.x + ca * (r + 4), c.y + sa * (r + 4));
      }
      ctx.stroke();
    }
    ctx.globalAlpha = .55 + .4 * eFrac;
    ctx.fillStyle = bodyL(0);
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},75%,72%,.8)`; ctx.lineWidth = 1; ctx.stroke();
  }
  else if (d.tier === 1) {
    ctx.globalAlpha = .6 + .35 * eFrac;
    ctx.fillStyle = bodyL(1);
    ctx.beginPath();
    ctx.ellipse(c.x + hx * r * .95, c.y + hy * r * .95, r * .72, r * .45, c.heading, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= 13; i++) {
      const a = i / 13 * TAU;
      const rr = r * (1 + .16 * Math.sin(a * 3 + c.tailP * 2));
      const px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},75%,72%,.75)`; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = `hsla(${hue},45%,72%,.9)`;
    ctx.beginPath(); ctx.arc(c.x - hx * r * .1, c.y - hy * r * .1, r * .3, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},40%,60%,.7)`;
    ctx.beginPath(); ctx.arc(c.x - hx * r * .1, c.y - hy * r * .1, r * .3, 0, TAU); ctx.stroke();
  }
  else if (d.tier === 2) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.heading);
    ctx.globalAlpha = .5 + .4 * eFrac;
    const flap = Math.sin(c.tailP * 1.7) * r * .5;
    ctx.fillStyle = `hsla(${hue},65%,60%,.55)`;
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, 0);
    ctx.lineTo(-r * 1.85, flap - r * .45);
    ctx.lineTo(-r * 1.7, flap);
    ctx.lineTo(-r * 1.85, flap + r * .45);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = bodyL(2);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * .72, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},75%,72%,.8)`; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},70%,68%,.5)`;
    ctx.beginPath(); ctx.moveTo(-r * .9, -r * .6); ctx.quadraticCurveTo(0, -r * .95, r * .8, -r * .35); ctx.stroke();
    ctx.fillStyle = 'rgba(255,244,220,.9)';
    ctx.beginPath(); ctx.arc(r * .85, 0, Math.max(1.2, r * .18), 0, TAU); ctx.fill();
    ctx.restore();
  }
  else if (d.tier === 3) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.heading);
    ctx.globalAlpha = .5 + .4 * eFrac;
    ctx.strokeStyle = `hsla(${hue},55%,58%,.75)`; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const bx = i * r * .55;
      const kick = Math.sin(c.tailP * 2.6 + i * 1.9) * r * .5;
      for (const s of [-1, 1]) {
        ctx.moveTo(bx, s * r * .55);
        ctx.lineTo(bx + kick, s * r * 1.45);
      }
    }
    ctx.stroke();
    ctx.fillStyle = `hsl(${hue},${d.amnion ? 30 : 45}%,${(d.amnion ? 20 : 24) + eFrac * 14}%)`;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * .72, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},70%,64%,.85)`; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},60%,55%,.4)`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) { ctx.moveTo(i * r * .42, -r * .66); ctx.lineTo(i * r * .42, r * .66); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,214,.9)';
    ctx.beginPath(); ctx.arc(r * .8, -r * .18, Math.max(1.2, r * .14), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .8, r * .18, Math.max(1.2, r * .14), 0, TAU); ctx.fill();
    ctx.restore();
  }
  else if (d.tier === 4) {
    /* therapsid: sprawled legs gone upright, fur halo, heavier skull */
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.heading);
    ctx.globalAlpha = .5 + .4 * eFrac;
    ctx.strokeStyle = `hsla(${hue},40%,68%,.5)`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      const rr = r * (1.08 + .07 * Math.sin(a * 5 + c.tailP));
      ctx.moveTo(Math.cos(a) * r * .88, Math.sin(a) * r * .88);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},55%,56%,.8)`; ctx.lineWidth = Math.max(1.2, r * .12);
    ctx.beginPath();
    for (const s of [-1, 1]) for (const lx of [-.45, .35]) {
      const kick = Math.sin(c.tailP * 2.6 + lx * 4) * r * .18;
      ctx.moveTo(lx * r, s * r * .55);
      ctx.lineTo(lx * r + kick, s * r * 1.15);
    }
    ctx.stroke();
    ctx.fillStyle = `hsl(${hue},36%,${(d.warm ? 30 : 24) + eFrac * 15}%)`;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * .8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},62%,64%,.85)`; ctx.lineWidth = 1.3; ctx.stroke();
    /* canines */
    if (d.diet > .45) {
      ctx.strokeStyle = 'rgba(240,230,210,.8)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 1.05, -r * .18); ctx.lineTo(r * 1.25, -r * .34);
      ctx.moveTo(r * 1.05, r * .18); ctx.lineTo(r * 1.25, r * .34);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,240,214,.9)';
    ctx.beginPath(); ctx.arc(r * .95, -r * .17, Math.max(1.2, r * .13), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .95, r * .17, Math.max(1.2, r * .13), 0, TAU); ctx.fill();
    ctx.restore();
  }
  else {
    /* mammal: rounded furred body, ears, wagging tail, snout */
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.heading);
    ctx.globalAlpha = .55 + .4 * eFrac;
    const tw = Math.sin(c.tailP * 2.2) * r * .35;
    ctx.strokeStyle = `hsla(${hue},50%,62%,.85)`; ctx.lineWidth = Math.max(1.5, r * .2);
    ctx.beginPath(); ctx.moveTo(-r * 1.15, 0);
    ctx.quadraticCurveTo(-r * 1.7, tw, -r * 2.25, tw * 1.5); ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},50%,54%,.85)`; ctx.lineWidth = Math.max(1.4, r * .18);
    ctx.beginPath();
    for (const s of [-1, 1]) for (const lx of [-.5, .42]) {
      ctx.moveTo(lx * r, s * r * .55);
      ctx.lineTo(lx * r + Math.sin(c.tailP * 2.6 + lx * 5 + s) * r * .22, s * r * 1.12);
    }
    ctx.stroke();
    ctx.fillStyle = `hsl(${hue},${d.warm ? 42 : 32}%,${26 + eFrac * 17}%)`;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * .84, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `hsla(${hue},58%,66%,.9)`; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = `hsla(${hue},48%,66%,.95)`;
    ctx.beginPath(); ctx.arc(r * .52, -r * .68, r * .24, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .52, r * .68, r * .24, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,214,.95)';
    ctx.beginPath(); ctx.arc(r * 1.22, 0, Math.max(1.3, r * .15), 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (c.shore) {
    ctx.globalAlpha = .5;
    ctx.strokeStyle = 'rgba(240,217,171,.6)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(c.x, c.y, r + 6, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}

function render(dtReal) {
  ctx.fillStyle = sandTile || '#0e0c08';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = dryGrad; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(30,26,16,.55)';
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(CX, CY, R + 9, 0, TAU); ctx.stroke();

  ctx.fillStyle = waterGrad;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.fill();

  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(217,163,92,.28)';
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(160,200,190,${.08 + .05 * Math.sin(simTime * 1.1)})`;
  ctx.beginPath(); ctx.arc(CX, CY, R + 3 + Math.sin(simTime * .9) * 2, 0, TAU); ctx.stroke();

  for (const v of vents) {
    const s = 150 + Math.sin(simTime * 1.3 + v.x) * 14;
    ctx.globalAlpha = .5;
    ctx.drawImage(glowSprite(28), v.x - s / 2, v.y - s / 2, s, s);
    ctx.globalAlpha = .8;
    ctx.strokeStyle = 'rgba(217,163,92,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(v.x, v.y + 22, 26, Math.PI + .5, TAU - .5); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const s of snow) {
    s.y += s.sp * dtReal; s.x += Math.sin(s.ph + simTime * .4) * 3 * dtReal;
    if (distC(s.x, s.y) > R - 6) { const p = randomInDish(.95); s.x = p.x; s.y = p.y; }
  }
  ctx.fillStyle = 'rgba(190,210,205,.10)';
  ctx.beginPath();
  for (const s of snow) { ctx.moveTo(s.x + s.r, s.y); ctx.arc(s.x, s.y, s.r, 0, TAU); }
  ctx.fill();

  /* defensive: never draw anything marked eaten, whatever else happens */
  for (const m of motes) {
    if (m.eaten) continue;
    const fade = clamp(1 - (m.age / m.life - .7) / .3, 0, 1);
    ctx.globalAlpha = .75 * fade;
    const spr = m.type === 'plant' ? ALGAE_SPR() : m.type === 'meat' ? MEAT_SPR() : WRACK_SPR();
    const s = m.type === 'plant' ? 10 : m.type === 'meat' ? 13 : 9;
    ctx.drawImage(spr, m.x - s, m.y - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;

  for (const c of cells) drawCell(c);

  if (raining > 0) {
    ctx.strokeStyle = 'rgba(170,200,195,.14)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const rx = (i * 173.3 + simTime * 460) % W, ry = (i * 97.7 + simTime * 620) % H;
      ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 11);
    }
    ctx.stroke();
  }

  for (const f of fx) {
    if (f.k === 'shock') {
      ctx.strokeStyle = `hsla(${f.hue},80%,70%,${clamp(f.a, 0, 1)})`;
      ctx.lineWidth = f.w + 6 * f.a;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `hsla(20,90%,85%,${f.a * .7})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * .92, 0, TAU); ctx.stroke();
    } else if (f.k === 'ring') {
      ctx.strokeStyle = `hsla(${f.hue},75%,72%,${f.a})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke();
    } else {
      const s = f.r * 3;
      ctx.globalAlpha = clamp(f.a, 0, 1) * .6;
      ctx.drawImage(glowSprite(f.hue | 0), f.x - s / 2, f.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,232,200,${flash * .5})`;
    ctx.fillRect(0, 0, W, H);
    flash = Math.max(0, flash - dtReal * 1.4);
  }
}

/* ---------------- interaction ---------------- */
const ptr = { down: false, id: null, px: 0, py: 0, moved: 0 };
cv.addEventListener('pointerdown', e => {
  if (ptr.down) return; /* ignore secondary pointers — one stir at a time */
  ptr.down = true; ptr.id = e.pointerId; ptr.moved = 0; ptr.px = e.clientX; ptr.py = e.clientY;
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.px, dy = e.clientY - ptr.py;
  ptr.moved += Math.abs(dx) + Math.abs(dy);
  ptr.px = e.clientX; ptr.py = e.clientY;
  if (ptr.moved > 8) stir(e.clientX, e.clientY, dx, dy);
});
cv.addEventListener('pointerup', e => {
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const wasTap = ptr.moved <= 8;
  ptr.down = false; ptr.id = null;
  if (wasTap) tap(e.clientX, e.clientY);
});
/* OS-level cancellations (palm rejection, alt-tab mid-drag, incoming call)
   otherwise leave ptr.down stuck true and every mouse move stirs the pond */
cv.addEventListener('pointercancel', () => { ptr.down = false; ptr.id = null; });
function tap(x, y) {
  if (inDish(x, y, 10)) {
    fx.push({ k: 'ring', x, y, r: 4, spd: 90, a: .5, da: 1.1, hue: 130 });
    for (let i = 0; i < 8; i++) {
      const a = rand(0, TAU), sp = rand(6, 26);
      spawnMote(x, y, 'plant', rand(10, 15), Math.cos(a) * sp, Math.sin(a) * sp);
    }
  } else if (distC(x, y) < R + BEACH * 1.5) {
    fx.push({ k: 'ring', x, y, r: 4, spd: 70, a: .4, da: 1.2, hue: 72 });
    for (let i = 0; i < 5; i++) {
      const wx = x + rand(-14, 14), wy = y + rand(-10, 10);
      /* project onto sand — wrack spawned inside the dish is stationary and
         unreachable by any grazer, so it would just rot */
      const wd = Math.max(distC(wx, wy), R + 6), wa = Math.atan2(wy - CY, wx - CX);
      spawnMote(CX + Math.cos(wa) * wd, CY + Math.sin(wa) * wd, 'wrack', rand(14, 22));
    }
  }
}
function stir(x, y, dx, dy) {
  const RR = 110;
  const apply = (o, mass) => {
    const ddx = o.x - x, ddy = o.y - y, dd = ddx * ddx + ddy * ddy;
    if (dd < RR * RR) {
      const f = (1 - Math.sqrt(dd) / RR) * 2.4 / mass;
      o.vx += dx * f; o.vy += dy * f;
    }
  };
  for (const m of motes) if (m.type !== 'wrack' && !m.eaten) apply(m, 1);
  for (const c of cells) apply(c, clamp(c.dna.size / 3, 1, 4));
  if (Math.random() < .3) fx.push({ k: 'ring', x, y, r: 8, spd: 60, a: .12, da: .7, hue: 160 });
}

const btnPlay = $('btnPlay'), btnSpeed = $('btnSpeed'), btnSeed = $('btnSeed'),
      btnImpact = $('btnImpact'), introEl = $('intro');
const icoPlay = $('icoPlay'), icoPause = $('icoPause');
const setPlayIcon = () => { icoPlay.hidden = running; icoPause.hidden = !running; };

btnPlay.addEventListener('click', () => { if (started) { running = !running; setPlayIcon(); } });
const SPEEDS = [1, 2, 4, 8, 12, 20, 40, 60, 80, 120, 240, 500, 1000];
let speedIdx = 0;
btnSpeed.addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  speedMul = SPEEDS[speedIdx];
  btnSpeed.textContent = speedMul + '×';
});
btnSeed.addEventListener('click', () => {
  if (!started) { begin(); return; }
  const v = vents[(Math.random() * vents.length) | 0];
  for (let i = 0; i < 12; i++)
    spawnMote(v.x + rand(-60, 60), v.y + rand(-60, 60), 'plant', rand(12, 16), rand(-6, 6), rand(-6, 6));
  for (let i = 0; i < 5; i++) {
    const a = rand(0, TAU), r = rand(0, 36);
    addCell(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r, founderDNA(), 1, 85);
  }
  log('A stray spore drifts in from another pond.');
});
btnImpact.addEventListener('click', () => {
  impact();
  btnImpact.disabled = true;
  setTimeout(() => btnImpact.disabled = false, 6000);
});
document.querySelectorAll('#stats h2').forEach(h => {
  h.addEventListener('click', () => {
    h.classList.toggle('closed');
    const sec = h.nextElementSibling;
    sec.style.display = sec.style.display === 'none' ? '' : 'none';
  });
});
addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (started) { running = !running; setPlayIcon(); }
  }
});
function begin() {
  if (started) return;
  started = true; running = true; setPlayIcon();
  introEl.classList.add('gone');
  setTimeout(() => introEl.remove(), 950);
  abiogenesis('Abiogenesis — the first replicators stir near a vent.');
  log('Click the water to feed it. Click the sand to wash up food. Drag to stir.');
}
 $('btnBegin').addEventListener('click', begin);
introEl.addEventListener('click', begin);

/* ---------------- boot ---------------- */
function initSnow() {
  snow = [];
  for (let i = 0; i < 60; i++) {
    const p = randomInDish(.98);
    snow.push({ x: p.x, y: p.y, r: rand(.6, 1.5), ph: rand(0, TAU), sp: rand(2.5, 7) });
  }
}
resize();
/* coalesce resize storms — the sand pattern rebuild is too costly per event */
let resizeQueued = false;
addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; resize(); });
});
initSnow();
let last = performance.now(), acc = 0;
function frame(now) {
  const dtReal = Math.min((now - last) / 1000, .05); last = now;
  if (running) {
    acc += dtReal * speedMul;
    let it = 0;
    /* step budget must cover 1000× on a 30 Hz tab (1000 × 2 = 2000); beyond
       what the hardware finishes per frame, time is dropped gracefully */
    while (acc >= 1 / 60 && it < 2000) { step(1 / 60); acc -= 1 / 60; it++; }
    if (it >= 2000) acc = 0;
  }
  render(dtReal);
  requestAnimationFrame(frame);
}
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
