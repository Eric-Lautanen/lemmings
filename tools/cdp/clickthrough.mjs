// CDP click-through: skill buttons + digger assignment via real mouse events.
// Uses the default page (Fun 1, 10 diggers). Kills chrome when done.
import { execSync } from 'node:child_process';

const CDP = 'http://127.0.0.1:9223';
const APP = 'http://127.0.0.1:8137/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tabs = await (await fetch(CDP + '/json')).json();
const tab = tabs.find((t) => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((resolve) => {
  const id = ++seq;
  pending.set(id, (m) => resolve(m));
  ws.send(JSON.stringify({ id, method, params }));
});
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r && r.result ? r.result.result.value : undefined;
};
const clickAt = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};

try {
  await send('Page.navigate', { url: APP });
  await sleep(4000);

  // wait until the game has a loaded level and a canvas
  let info = null;
  for (let tries = 0; tries < 40 && !info; tries++) {
    info = await evalJs(`(() => {
      const st = window._lemTest && window._lemTest.state;
      const cv = document.querySelector('canvas');
      if (!st || !st.level || !cv) return null;
      const r = cv.getBoundingClientRect();
      return { skills: st.level.skills.slice(), rect: { left: r.left, top: r.top, w: r.width, h: r.height } };
    })()`);
    if (!info) await sleep(500);
  }
  if (!info) throw new Error('game never became ready');
  console.log('level skills:', JSON.stringify(info.skills));
  const map = (px, py) => ({
    x: info.rect.left + px / 320 * info.rect.w,
    y: info.rect.top + py / 200 * info.rect.h,
  });

  // 1. each skill button sets selSkill
  const selResults = [];
  for (let s = 0; s < 8; s++) {
    const b = map(1 + s * 16 + 7, 188);
    await clickAt(b.x, b.y);
    await sleep(80);
    const sel = await evalJs('window._lemTest.state.selSkill');
    selResults.push(`skill ${s}: sel=${sel} ${sel === s ? 'OK' : 'FAIL'}`);
  }
  console.log(selResults.join('\n'));

  // 2. select digger, click a walking lem, verify assign + count
  const bd = map(1 + 7 * 16 + 7, 188);
  await clickAt(bd.x, bd.y);
  await sleep(80);
  const before = await evalJs('window._lemTest.state.level.skills[7]');
  let done = false;
  for (let tries = 0; tries < 40 && !done; tries++) {
    const hit = await evalJs(`(() => {
      const st = window._lemTest.state;
      const l = st.lems.find(l => !l.dead && !l.rescued && l.state === 'walk' &&
        l.x >= st.cam && l.x < st.cam + 320);
      if (!l) return null;
      const rect = document.querySelector('canvas').getBoundingClientRect();
      // DOS hitbox is x+1..x+13: click the middle
      return { x: rect.left + (l.x + 7 - st.cam) / 320 * rect.width,
               y: rect.top + (l.y - 2) / 200 * rect.height, idx: st.lems.indexOf(l) };
    })()`);
    if (!hit) { await sleep(250); continue; }
    await clickAt(hit.x, hit.y);
    await sleep(400);
    const r = await evalJs(`(() => {
      const st = window._lemTest.state;
      const l = st.lems[${hit.idx}];
      return { skills: st.level.skills[7], state: l ? l.state : 'GONE' };
    })()`);
    if (r && r.state !== 'walk' && r.state !== 'GONE') {
      console.log(`digger: count ${before}->${r.skills} state=${r.state} OK`);
      done = true;
    }
  }
  if (!done) console.log('digger: ASSIGN FAIL (no walker assigned in 40 tries)');
  console.log(done ? 'CLICK-THROUGH PASS' : 'CLICK-THROUGH FAIL');
} catch (e) {
  console.log('CLICK-THROUGH ERROR:', e.message);
} finally {
  ws.close();
  // kill only the headless instance (identified by its debugging port)
  try {
    execSync('wmic process where "name=\'chrome.exe\' and commandline like \'%remote-debugging-port=9223%\'" call terminate >nul 2>&1', { stdio: 'ignore' });
  } catch {}
  console.log('chrome killed');
}
process.exit(0);
