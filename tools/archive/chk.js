const fs = require('fs');
const src = fs.readFileSync('tools/build_bundle.py', 'utf8');
const i = src.indexOf('trig_effect');
console.log('--- before ---');
console.log(src.slice(i - 1200, i + 200));
