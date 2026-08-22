const fs = require('fs');
const s = fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8');
global.window = {};
eval(s);
const A = window.GAME_ASSETS;
const lv = A.levels[78];
for (const t of lv.terrain) {
  if (t[3] === 9 || (t[0] <= 792 && t[0] + 32 >= 748) || t[0] < 0)
    console.log('tid=' + t[3] + ' mods=' + t[1] + ' x=' + t[0] + ' y=' + Math.round(t[2]));
}
