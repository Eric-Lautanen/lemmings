// All-18-SFX trace: init + start + set_tempo(n) at update 20, 400 updates each.
// Output: sfx_js.txt — must match sfx_py.txt byte-for-byte.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'web', 'adlib_data.js'), 'utf8'), { filename: 'adlib_data.js' });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'web', 'adlib.js'), 'utf8'), { filename: 'adlib.js' });
const ADLIB = global.window.ADLIB;
const out = [];

for (let n = 0; n < 19; n++) {
  const driver = new ADLIB.Driver(ADLIB.decodeB64(global.window.ADLIB_DRIVER_B64));
  driver.init();
  driver.set_tune(1);
  driver.start();
  out.push('=== sfx' + n + ' ===');
  for (let i = 0; i < 400; i++) {
    driver.update();
    if (i === 20) driver.set_tempo(n);
    for (const ev of driver.events) out.push(ev[0].toString(16).toUpperCase().padStart(2, '0') + ' ' + ev[1].toString(16).toUpperCase().padStart(2, '0'));
    driver.events.length = 0;
  }
}
fs.writeFileSync('sfx_js.txt', out.join('\n'));
console.log('js sfx dump done');