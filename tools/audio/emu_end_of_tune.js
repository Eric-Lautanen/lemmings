// Run the REAL emulated 8086 driver through a full tune + loop boundary.
// Ground truth for what happens at end-of-tune.
'use strict';
const fs = require('fs');
const path = require('path');
global.window = {};
const vm = require('vm');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'adlib_data.js'), 'utf8'));
const b64 = global.window.ADLIB_DRIVER_B64.match(/'([A-Za-z0-9+/=]+)'/)[1];

// reuse emu8086 via python? No - use the JS side: spawn python emu8086 is heavy.
// Instead: drive it through child_process calling a tiny py runner is done separately.
// Here we just note this file is superseded by tools/audio/emu_end_of_tune.py
console.log('see tools/audio/emu_end_of_tune.py');
