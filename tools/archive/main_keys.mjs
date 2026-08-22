import fs from 'fs';
const src = fs.readFileSync('web/assets.js', 'utf8');
const i = src.indexOf('"main"');
const j = src.indexOf('"level"', i + 1000); // end of main object approx
const block = src.slice(i, i + 200000);
const keys = [...block.matchAll(/"(\w+)":\s*\{/g)].map(m => m[1]);
console.log('main keys:', keys.join(', '));
const fontIdx = block.indexOf('"font"');
console.log('font at', fontIdx);
if (fontIdx >= 0) console.log(block.slice(fontIdx, fontIdx + 500));