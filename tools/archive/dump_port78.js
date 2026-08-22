const fs = require('fs');
const s = fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8');
global.window = {};
eval(s);
const A = window.GAME_ASSETS;
const lv = A.levels[78];
console.log('terrain count', lv.terrain.length, 'objs', lv.objs.length);
const g = A.gfx[lv.gfxset];
for (const t of lv.terrain) {
  const tid = t[3], x = t[0], y = Math.round(t[2]);
  const tile = g.terrains[tid];
  if (!tile) continue;
  const w = tile.w, h = tile.h;
  if (x + w > 748 && x < 780 && y < 15 && y + h > 0)
    console.log('tid=' + tid + ' mods=' + t[1] + ' x=' + x + ' y=' + y + ' w=' + w + ' h=' + h + ' x+w=' + (x + w) + ' y+h=' + (y + h));
}
console.log('--- objects ---');
for (const o of lv.objs) console.log(JSON.stringify(o));
