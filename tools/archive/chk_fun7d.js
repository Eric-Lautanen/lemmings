const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
vm.runInThisContext(fs.readFileSync('web/game.js', 'utf8'), { filename: 'game.js' });
const T = window._lemTest;
T.resetLevel(6);
const L = T.state.level;
const solidAt = (L, x, y) => x < 0 || y < 0 || x >= L.W || y >= L.H ? 0 : L.solid[y * L.W + x];
function findGround(L, x, gy) {
  var r = 0;
  if (solidAt(L, x, gy)) {
    while (solidAt(L, x, gy + r - 1) && r > -10) r--;
  } else {
    r = 1;
    while (!solidAt(L, x, gy + r) && r < 4) r++;
  }
  return r;
}
let builds = 0, assigned = 0, builderLog = [], followerLog = [];
let firstFollowerSeen = null;
for (let t = 0; t < 30000 && !T.state.over; t++) {
  T.stepSim(L);
  const lems = T.state.lems;
  // assign builder to the leading lem when its front probe enters 682..698 (early ramp)
  if (assigned < 1 && L.skills[4] > 0) {
    const cand = lems.filter(l => !l.dead && !l.rescued && l.state === 'walk');
    const pick = cand.sort((a, b) => b.x - a.x)[0];
    if (pick && pick.dir > 0 && Math.round(pick.x + 12) >= 694 && Math.round(pick.x + 12) <= 702) {
      if (T.assignSkill(L, pick, 4)) { assigned++; builds++; console.log('assigned builder at x=' + pick.x.toFixed(2) + ' t=' + t); }
    }
  }
  for (const l of lems) {
    if (l.state === 'build' && builderLog.length < 20000) builderLog.push(t + ':' + l.x.toFixed(1) + ',' + l.y.toFixed(1) + ',bn' + l.bn + ',bL' + l.bricksLeft);
    if (assigned && firstFollowerSeen === null && !l.dead && !l.rescued && l.state !== 'build' && l.x < 711 && l.x > 660 && followerLog.length < 20000) {
      const fx = l.dir > 0 ? Math.round(l.x + 11) : Math.round(l.x - 1);
      const gy = Math.round(l.y) + 1;
      followerLog.push(t + ':' + l.x.toFixed(1) + ',' + l.y.toFixed(1) + ',fx' + fx + ',dy' + findGround(L, fx, gy) + ',' + l.state);
    }
  }
  if (t % 5000 === 0 && t > 0) {
    const alive = lems.filter(l => !l.dead && !l.rescued);
    console.log('t' + t, 'rescued', T.state.rescued, 'alive', alive.length,
      'maxX', alive.length ? Math.max(...alive.map(l => l.x)) : '-', 'builds', builds);
  }
}
console.log('over:', T.state.over, 'rescued:', T.state.rescued, 'builds:', builds);
const alive = T.state.lems.filter(l => !l.dead && !l.rescued);
console.log('alive:', alive.length, 'max x:', alive.length ? Math.max(...alive.map(l => l.x)) : '-');
console.log('--- builder log ---');
console.log(builderLog.join('\n'));
console.log('--- follower log ---');
console.log(followerLog.join('\n'));
console.log('--- ramp cells cols 660-750 rows 76-98 ---');
for (let y = 76; y <= 98; y++) {
  let row = '';
  for (let x = 660; x <= 750; x++) row += solidAt(L, x, y) ? '#' : '.';
  console.log(String(y).padStart(2) + ' ' + row);
}