// Register-trace dump: JS driver vs Python reference (dump_events_py.py).
// Output: events_js.txt — compare with events_py.txt, must be byte-identical.
'use strict';
const fs = require('fs');
const path = require('path');
global.window = {};
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, 'web', 'adlib_data.js'), 'utf8');
const m = src.match(/'([A-Za-z0-9+/=]+)'/);
global.window.ADLIB_DRIVER_B64 = m[1];
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'web', 'adlib.js'), 'utf8'), { filename: 'adlib.js' });
const ADLIB = global.window.ADLIB;

let driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
const out = [];
function logs(label, n) {
  out.push('=== ' + label + ' ===');
  for (let i = 0; i < n; i++) {
    driver.update();
    for (const ev of driver.events) out.push(ev[0].toString(16).toUpperCase().padStart(2, '0') + ' ' + ev[1].toString(16).toUpperCase().padStart(2, '0'));
    driver.events.length = 0;
  }
}

for (let t = 1; t <= 21; t++) {
  driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
  driver.init(); driver.set_tune(t); driver.start();
  logs('tune' + t, 600);
}
driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
driver.init(); driver.set_tune(1); driver.start(); driver.set_tempo(1);
logs('sfx1', 200);
driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
driver.init(); driver.set_tune(2); driver.start(); driver.set_tempo(18);
logs('sfx18', 200);
driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
driver.init(); driver.set_tune(3); driver.start();
logs('switch', 60);
fs.writeFileSync('events_js.txt', out.join('\n'));
console.log('js dump done');