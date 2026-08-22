// DSP sanity probe: validate OPL renderer frequencies + FM spectra.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'adlib_data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'adlib.js'), 'utf8'));
const ADLIB = window.ADLIB;

function makeRenderer() {
  const r = new ADLIB.OplRenderer(44100);
  return r;
}
// Goertzel magnitude at frequency hz over the sample block
function goertzel(buf, sr, hz) {
  const k = Math.round(hz * buf.length / sr);
  const w = 2 * Math.PI * k / buf.length;
  let sPrev = 0, sPrev2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = buf[i] + 2 * Math.cos(w) * sPrev - sPrev2;
    sPrev2 = sPrev; sPrev = s;
  }
  return Math.sqrt(sPrev2 * sPrev2 + sPrev * sPrev - 2 * Math.cos(w) * sPrev * sPrev2);
}

// ---- Test 1: additive pure tone, block=4 fnum=1024 -> expect ~546 Hz ----
{
  const r = makeRenderer();
  r.apply(0x20 + 3, 0x11);   // carrier op ch0: mult=1, no trem/vib
  r.apply(0x40 + 3, 0x00);   // full level
  r.apply(0x60 + 3, 0xF0);   // fastest attack
  r.apply(0x80 + 3, 0xFF);   // fast release
  r.apply(0xC0 + 0, 0x31);   // alg=1 (additive), fb=0... wait bit0=alg
  r.apply(0xA0 + 0, 720);
  r.apply(0xB0 + 0, 0x20 | ((720 >> 8) & 0x03) | (4 << 2) | 0x20);
  const buf = [];
  for (let i = 0; i < 44100; i++) buf.push(r.process());
  // measure strongest low-frequency peak by scanning Goertzel
  let bestHz = 0, bestMag = -1;
  for (let hz = 100; hz <= 3000; hz += 4) {
    const m = goertzel(buf.slice(4410), 44100, hz);
    if (m > bestMag) { bestMag = m; bestHz = hz; }
  }
  console.log('additive tone: peak at', bestHz, 'Hz (expect ~546)');
}

// ---- Test 2: FM pair mod=car=mult1 same freq -> energy at 2f and near-DC ----
{
  const r = makeRenderer();
  r.apply(0x20 + 0, 0x11);   // modulator mult=1
  r.apply(0x20 + 3, 0x11);   // carrier mult=1
  r.apply(0x40 + 0, 0x00);   // mod full level (strong modulation)
  r.apply(0x40 + 3, 0x00);
  r.apply(0x60 + 0, 0xF0); r.apply(0x80 + 0, 0xFF);
  r.apply(0x60 + 3, 0xF0); r.apply(0x80 + 3, 0xFF);
  r.apply(0xC0 + 0, 0x30);   // alg=0 (FM)
  r.apply(0xA0 + 0, 720);
  r.apply(0xB0 + 0, 0x20 | ((720 >> 8) & 0x03) | (4 << 2) | 0x20);
  const buf = [];
  for (let i = 0; i < 44100; i++) buf.push(r.process());
  const b = buf.slice(4410);
  const f0 = 546;
  const mDC = goertzel(b, 44100, 60);
  const mf0 = goertzel(b, 44100, f0);
  const m2f0 = goertzel(b, 44100, 2 * f0);
  console.log('FM pair: mag@60Hz=%.1f @546=%.1f @1092=%.1f (sidebands present => FM ok)',
    mDC, mf0, m2f0);
}
