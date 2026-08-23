// Latency measurement: time from playSfx() call to first nonzero SFX-chip output
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'vendor', 'opl3.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'adlib_data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'adlib.js'), 'utf8'));

global.window.AudioContext = function () {
  this.sampleRate = 44100;
  this.state = 'running';
  this.destination = {};
  this.resume = () => Promise.resolve();
  this.createScriptProcessor = function (len) {
    return { onaudioprocess: null, connect() {} };
  };
};

const ADLIB = window.ADLIB;
const audio = new ADLIB.AdlibAudio();
audio.init();
audio.setMusicOn(false);

function sfxEnergy(samples) {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / samples.length);
}

const TICK = Math.round(44100 / 72.8261);
let acc = 0;

// measure latency over several trials
for (let trial = 0; trial < 5; trial++) {
  // run the clock until just before a tick boundary (worst case: trigger
  // right AFTER a scheduled tick, so the old code waited ~13.7ms)
  audio.sfxDriver.update();
  const sv = audio.sfxDriver.events.slice();
  for (const e of sv) audio.sfxRenderer.apply(e[0], e[1]);
  acc = TICK - 2; // force nextTick to be due on the very next sample check

  audio.playSfx(4); // skill-assign chime

  let latencySamples = -1;
  const win = [];
  for (let i = 0; i < TICK * 6; i++) {
    // replicate the audio callback's tick scheduling (bounded catch-up)
    let ticks = 0;
    while (acc >= TICK && ticks++ < 6) { audio._pumpDrivers(); acc -= TICK; }
    acc++;
    const s = audio.sfxRenderer.process();
    if (Math.abs(s) > 0.0005 && latencySamples < 0) latencySamples = i;
    if (win.length < TICK * 6) win.push(s);
  }
  console.log(`trial ${trial}: first audible sample at ${latencySamples} samples = ${(latencySamples / 44.1).toFixed(1)} ms`);
}
