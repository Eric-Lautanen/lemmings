import subprocess, json, sys

js = r"""
const fs = require('fs');
const vm = require('vm');
const ctx = { window: {}, console };
vm.createContext(ctx);
eval(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'));
const t = ctx.window.GAME_ASSETS.gfx['3'].terrains;
const out = {};
for (const idx of [0, 4, 5, 23, 25, 35]) {
  const rows = t[idx].rows;
  const runs = rows.map((row, r) => {
    let s = [];
    let i = 0;
    while (i < row.length) {
      if (row[i]) { let j = i; while (j < row.length && row[j]) j++; s.push(i + '-' + (j - 1)); i = j; }
      else i++;
    }
    return r + ':' + (s.join(',') || 'e');
  });
  out[idx] = { w: t[idx].w, h: t[idx].h, runs: runs };
}
console.log(JSON.stringify(out));
"""
res = subprocess.run(['node', '-e', js], capture_output=True, text=True)
data = json.loads(res.stdout)
for idx, d in data.items():
    print(f'TILE {idx} w={d["w"]} h={d["h"]}')
    print('  ' + ' | '.join(d['runs']))
