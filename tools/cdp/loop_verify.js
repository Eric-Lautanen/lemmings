const fs = require('fs'), vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('vendor/opl3.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('adlib_data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('adlib.js', 'utf8'));
global.window.AudioContext = function() {
  this.sampleRate = 44100; this.state = 'running'; this.destination = {};
  this.resume = () => Promise.resolve();
  this.createScriptProcessor = () => ({ onaudioprocess: null, connect() {} });
};
const audio = new window.ADLIB.AdlibAudio();
audio.init();
audio.playTune(5);
let restarts = 0;
const origEnd = audio.driver.onTuneEnd;
audio.driver.onTuneEnd = function() { restarts++; origEnd(); };
for (let t = 1; t <= 60000; t++) {
  audio._pumpMusic();
  if (restarts > 0) { console.log('RESTARTED at tick', t, '| restarts:', restarts); break; }
  if (t % 5000 === 0) console.log('t', t, 'tuneTick:', audio.tuneTick);
}
if (restarts === 0) { console.log('no restart after 60000 ticks'); process.exit(0); }
// verify it keeps looping
for (let t = 0; t < 60000; t++) {
  audio._pumpMusic();
  if (restarts > 1) { console.log('second restart at +', t, 'ticks — looping works'); break; }
}
console.log('total restarts:', restarts);
