// Audio quality probe: render ~3 s of tune 1 through the real audioprocess
// path (driver.update() + renderer) and report RMS / peak / clipping.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'adlib_data.js'), 'utf8'), { filename: 'adlib_data.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'adlib.js'), 'utf8'), { filename: 'adlib.js' });

const ADLIB = window.ADLIB;
const chunks = [];
let pumping = false;

global.window.AudioContext = function () {
  this.sampleRate = 44100;
  this.state = 'running';
  this.destination = {};
  this.resume = () => Promise.resolve();
  const self = this;
  this.createScriptProcessor = function (len) {
    return {
      onaudioprocess: null,
      connect() {
        if (!pumping || !this.onaudioprocess) return;
        const total = 44100 * 3;
        for (let done = 0; done < total; done += len) {
          const outL = new Float32Array(len);
          this.onaudioprocess({ outputBuffer: { length: len, getChannelData: (i) => outL } });
          for (let k = 0; k < len; k++) chunks.push(outL[k]);
        }
      }
    };
  };
};

const audio = new ADLIB.AdlibAudio();
pumping = true;
audio.init();
if (!audio.renderer) { console.log('FAIL: renderer not created'); process.exit(1); }
audio.driver.set_tune(1);
audio.driver.start();
// rewire the node handler and pump now that tune is set
const node = audio.node;
node.connect();

let peak = 0, sumSq = 0, n = 0, clipped = 0, nonfinite = 0;
for (const s of chunks) {
  if (!isFinite(s)) { nonfinite++; continue; }
  const a = Math.abs(s);
  if (a > peak) peak = a;
  if (a >= 0.999) clipped++;
  sumSq += s * s; n++;
}
console.log('samples=' + n +
    ' rms=' + (n ? Math.sqrt(sumSq / n).toFixed(4) : '-') +
    ' peak=' + peak.toFixed(4) + ' clipped=' + clipped + ' nonfinite=' + nonfinite);
