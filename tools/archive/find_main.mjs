import fs from 'fs';
const src = fs.readFileSync('web/assets.js', 'utf8');
const i = src.indexOf('"main"');
console.log('main at', i);
console.log(src.slice(i - 40, i + 300));