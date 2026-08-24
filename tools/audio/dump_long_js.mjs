// Register-trace dump: LONG runs (6000 ticks) for tunes 1, 4, 5 to cover loop
// points. Compare against dump_long_py.txt (emu8086 ground truth via Python ref).
'use strict';
const fs = require('fs');
const path = require('path');
global.window = {};
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'adlib_data.js'), 'utf8');
const m = src.match(/'([A-Za-z0-9+/=]+)'/);
global.window.ADLIB_DRIVER_B64 = m[1];
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'adlib.js'), 'utf8'), { filename: 'adlib.js' });
const ADLIB = global.window.ADLIB;

let driver;
const out = [];
function logs(label, n) {
  out.push('=== ' + label + ' ===');
  for (let i = 0; i < n; i++) {
    driver.update();
    for (const ev of driver.events) out.push(ev[0].toString(16).toUpperCase().padStart(2, '0') + ' ' + ev[1].toString(16).toUpperCase().padStart(2, '0'));
    driver.events.length = 0;
  }
}

for (const t of [1, 4, 5]) {
  driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
  driver.init(); driver.set_tune(t); driver.start();
  logs('tune' + t, 6000);
}
fs.writeFileSync(path.join(__dirname, 'events_long_js.txt'), out.join('\n'));
console.log('js long dump done:', out.length, 'lines');
