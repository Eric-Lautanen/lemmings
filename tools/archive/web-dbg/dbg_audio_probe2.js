// Probe: new dual-driver audio (vendored OPL3 core) - RMS, music/sfx isolation
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'vendor', 'opl3.js'), 'utf8'), { filename: 'vendor/opl3.js' });
if (!window.OPL3Core) { console.log('FAIL: vendor opl3.js did not expose window.OPL3Core'); process.exit(1); }
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'adlib_data.js'), 'utf8'), { filename: 'adlib_data.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'adlib.js'), 'utf8'), { filename: 'adlib.js' });

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
console.log('renderer:', audio.renderer.constructor.name, '(want Opl3Renderer)');
audio.driver.set_tune(1);
audio.driver.start();

const TICK_SAMPLES = 44100 / 72.8261;
let acc = 0;
function advance(n) {
  for (let i = 0; i < n; i++) {
    acc += 1;
    if (acc >= TICK_SAMPLES) {
      acc -= TICK_SAMPLES;
      audio.driver.update();
      const ev = audio.driver.events;
      for (let j = 0; j < ev.length; j++) audio.renderer.apply(ev[j][0], ev[j][1]);
      ev.length = 0;
      audio.sfxDriver.update();
      const sv = audio.sfxDriver.events;
      for (let j2 = 0; j2 < sv.length; j2++) audio.sfxRenderer.apply(sv[j2][0], sv[j2][1]);
      sv.length = 0;
    }
  }
}

function rms(n) {
  let sum = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    advance(1);
    const s = audio.renderer.process() * audio._musicGainNow +
              audio.sfxRenderer.process() * audio._sfxGainNow;
    sum += s * s;
    if (Math.abs(s) > peak) peak = Math.abs(s);
  }
  return { rms: Math.sqrt(sum / n), peak: peak };
}

let r1 = rms(44100 * 2);
console.log('music on : rms=' + r1.rms.toFixed(4) + ' peak=' + r1.peak.toFixed(4));

audio.setMusicOn(false);
let r2 = rms(22050);
console.log('music off: rms=' + r2.rms.toFixed(4) + '(want 0)');

audio.setMusicOn(false);
audio.playSfx(4);
let r3 = rms(11025);
console.log('sfx-only : rms=' + r3.rms.toFixed(4) + ' peak=' + r3.peak.toFixed(4) + ' (want > 0)');
