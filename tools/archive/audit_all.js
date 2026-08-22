'use strict';
const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('C:/github/Lemmings/web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
const A = window.GAME_ASSETS;

const summary = [];
for (let lvl = 0; lvl < 120; lvl++) {
  T.resetLevel(lvl);
  const L = T.state.level;
  const m = A.menu[lvl];
  let maxT = Math.ceil(L.timelimit * 17) + 300;
  let stuckAt = null, lastPush = 0, lastMaxX = 0, lastMaxY = 0;
  let maxX = 0, maxY = 0, minY = 1e9;
  try {
    for (let t = 0; t < maxT && !T.state.over; t++) {
      T.stepSim(L);
      let any = false;
      for (const l of T.state.lems) {
        if (l.dead || l.rescued) continue;
        any = true;
        const x = l.x, y = l.y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (y < minY) minY = y;
      }
      if (any && (maxX !== lastMaxX || maxY !== lastMaxY)) { lastPush = t; lastMaxX = maxX; lastMaxY = maxY; }
      if (any && t - lastPush > 900 && !stuckAt) stuckAt = t - lastPush;
      if (t > 120 && T.state.released === m.lems && T.state.rescued + T.state.lems.filter(l => l.rescued).length > 0) {}
    }
  } catch (e) {
    summary.push({ lvl, err: e.message });
    continue;
  }
  const alive = T.state.lems.filter(l => !l.dead && !l.rescued).length;
  const dead = T.state.lems.filter(l => l.dead).length;
  const rescued = T.state.lems.filter(l => l.rescued).length + T.state.lems.filter(l => l.freed && l.state === 'exit').length;
  summary.push({
    lvl, sec: m.section, name: m.name, rate: m.rate, lems: m.lems, need: m.rescue, time: L.timelimit,
    over: T.state.over, rescued: T.state.rescued, released: T.state.released, alive, dead,
    maxX: Math.round(maxX), maxY: Math.round(maxY), minY: Math.round(minY),
    stuck: stuckAt, skills: JSON.stringify(m.skills)
  });
}
let wins = 0, losses = 0;
for (const s of summary) {
  if (s.err) { console.log('ERR  lvl' + s.lvl + ': ' + s.err); continue; }
  if (s.over === 'win') { wins++; console.log('WIN  lvl' + s.lvl + ' [' + s.sec + '] ' + s.name + ' rescued=' + s.rescued + '/' + s.need); continue; }
  losses++;
  const flag = [];
  if (s.released < s.lems) flag.push('slow-release');
  if (s.dead > 30) flag.push('mass-death(' + s.dead + ')');
  if (s.rescued > 0) flag.push('rescued=' + s.rescued);
  console.log('LOSE lvl' + s.lvl + ' [' + s.sec + '] ' + s.name + ' over=' + s.over
    + ' rescued=' + s.rescued + ' dead=' + s.dead + ' alive=' + s.alive
    + ' maxX=' + s.maxX + ' minY=' + s.minY + (flag.length ? ' FLAGS:' + flag.join(',') : ''));
}
console.log('SUMMARY: wins=' + wins + ' losses=' + losses);