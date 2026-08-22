import fs from 'fs';
const src = fs.readFileSync('web/assets.js', 'utf8');
const start = src.indexOf('{');
const end = src.lastIndexOf('}');
const obj = JSON.parse(src.slice(start, end + 1));
for (const idx of [73, 77, 78, 79]) {
  const lv = obj.levels[idx];
  console.log('sec', idx, JSON.stringify({ name: lv.name, rate: lv.rate, lems: lv.lems, rescue: lv.rescue, time: lv.time, skills: lv.skills }));
}