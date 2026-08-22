// Browser-like audio smoke test: adlib_data -> adlib -> game with a fake AudioContext.
// Verifies: boot while ctx is suspended (autoplay policy), unlock via user gesture,
// music + sfx render finite samples through many sim ticks.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class FakeCtx {
  constructor() {
    this.sampleRate = 44100;
    this.state = 'suspended'; // browsers start suspended until a user gesture
    this.destination = {};
    this.samples = 0;
    this.queue = [];
    this.allowResume = false; // becomes true inside a user-gesture listener
  }
  resume() {
    if (!this.allowResume) return Promise.reject(new Error('Autoplay not allowed'));
    this.state = 'running';
    return Promise.resolve();
  }
  createScriptProcessor(len, inCh, outCh) {
    const self = this;
    const node = {
      connect() {},
      onaudioprocess: null,
      _tick(n) {
        const outL = new Float32Array(n), outR = new Float32Array(n);
        if (this.onaudioprocess)
          this.onaudioprocess({ outputBuffer: { length: n, getChannelData: (i) => i ? outR : outL } });
        self.samples += n;
        for (let i = 0; i < n; i++) { if (!isFinite(outL[i]) || !isFinite(outR[i])) throw new Error('NaN audio'); }
      }
    };
    self.queue.push(node);
    return node;
  }
}

global.window = {};
global.window.AudioContext = FakeCtx;
global.window.webkitAudioContext = FakeCtx;
global.AudioContext = FakeCtx;
global.webkitAudioContext = FakeCtx;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'assets.js'), 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'adlib_data.js'), 'utf8'), { filename: 'adlib_data.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'adlib.js'), 'utf8'), { filename: 'adlib.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8'), { filename: 'game.js' });

const T = window._lemTest;
if (!T) throw new Error('no _lemTest export');
if (!T.audio) throw new Error('no audio instance exposed');
T.resetLevel(0);
const L = T.state.level;
const ctx = T.audio.ctx;
const node = ctx && ctx.queue[0];
let fails = 0;

if (!ctx) { fails++; console.log('FAIL: no AudioContext created'); }
else console.log('ctx state at boot:', ctx.state, '(suspended = autoplay policy)');
if (ctx && ctx.state !== 'suspended') { fails++; console.log('FAIL: ctx should start suspended'); }

// 600 sim ticks while suspended: nothing may render yet, no exceptions
for (let t = 0; t < 600; t++) T.stepSim(L);
node._tick(1024);
console.log('samples while suspended:', ctx.samples);

// user gesture (browser would set a transient activation flag here) -> unlock
ctx.allowResume = true;
T.audio.unlock();
if (ctx.state !== 'running') { fails++; console.log('FAIL: unlock did not resume ctx'); }
for (let i = 0; i < 200; i++) { node._tick(1024); }
for (let t = 0; t < 2000; t++) {
  T.stepSim(L);
  if (t % 113 === 7) { for (let i = 0; i < 3; i++) node._tick(1024); }
}
console.log('after sim: over=' + T.state.over + ' rescued=' + T.state.rescued + ' lems=' + T.state.lems.length + ' timeLeft=' + T.state.timeLeft.toFixed(1));
if (T.state.over === 'lose') { fails++; console.log('FAIL: lost before timeout'); }

node._tick(1024);
console.log('samples rendered:', ctx.samples);
if (ctx.samples === 0) { fails++; console.log('FAIL: no samples rendered'); }
console.log(fails === 0 ? 'AUDIO SMOKE PASS' : 'AUDIO SMOKE FAIL (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
