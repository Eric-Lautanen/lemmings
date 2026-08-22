import fs from 'fs';
const A = JSON.parse(fs.readFileSync('build/assets.json', 'utf8'));
let modsCount = {}, bit4 = 0, objMisalign = [], objMods = {}, dispVals = {}, totalTer = 0, totalObj = 0;
for (let li = 0; li < A.levels.length; li++) {
  const lv = A.levels[li];
  for (const t of lv.terrain) {
    totalTer++;
    const m = t[1];
    modsCount[m] = (modsCount[m] || 0) + 1;
    // recover b0 bit4: not stored; tid>=64 implies web added +64
    if (t[3] >= 64) { console.log('tid>=64!', li, JSON.stringify(t)); }
  }
  for (const o of lv.objs) {
    totalObj++;
    objMods[o[3]] = (objMods[o[3]] || 0) + 1;
    dispVals[o[4]] = (dispVals[o[4]] || 0) + 1;
    if (o[0] % 8 !== 0) objMisalign.push([li, o[0], o[1], o[2]]);
  }
}
console.log('total terrain entries:', totalTer, 'mods histogram:', modsCount);
console.log('total objects:', totalObj, 'mods:', objMods, 'disp:', dispVals);
console.log('objects with x%8!=0:', objMisalign.length, objMisalign.slice(0, 20));
