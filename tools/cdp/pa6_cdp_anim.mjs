// Verify: (a) per-level win requirements (rescueNeed), (b) climb/float animations cycle
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9231;
const URL = 'file:///C:/github/Lemmings/index.html';

function cdp(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (m.error) reject(new Error(method + ': ' + JSON.stringify(m.error)));
      else resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp6-' + Date.now()),
    'about:blank'
  ]);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch (e) { }
  }
  if (!target) throw new Error('devtools target not found');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let n = 1;
  const send = (m, p) => cdp(ws, n++, m, p);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL });
  await sleep(4000);
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails));
    return r.result.value;
  };

  const setLevel = (idx) => `(() => { const s = document.getElementById('lvlsel'); s.value = '${idx}'; s.dispatchEvent(new Event('change')); })()`;

  const need = await evalJs(`(() => {
    const T = window._lemTest;
    const out = [];
    for (let i = 0; i < 8; i++) {
      const s = document.getElementById('lvlsel'); s.value = String(i); s.dispatchEvent(new Event('change'));
      const L = T.state.level;
      out.push(L.name.trim() + ': lems=' + L.lems + ' rescue=' + L.rescueNeed + ' time=' + L.timelimit);
    }
    return out.join('\\n');
  })()`);
  console.log('WIN REQUIREMENTS (Fun 1-8):');
  console.log(need);

  // --- animation check: climber (force the climb state, sample sprite frames) ---
  const climb = await evalJs(`(async () => {
    const T = window._lemTest;
    T.state.paused = true;
    ${setLevel(7)}
    const L = T.state.level;
    let target = null;
    for (let t = 0; t < 600 && !target; t++) {
      T.stepSim(L);
      target = T.state.lems.find(l => !l.dead && !l.rescued);
    }
    if (!target) return 'CLIMB: no lem';
    target.state = 'climb'; target.stT = target.tick; target.dir = 1;
    const cx = Math.round(target.x), cy = Math.round(target.y);
    T.state.cam = Math.max(0, Math.min(L.W - 320, cx - 160));
    const hashes = [];
    for (let k = 0; k < 8; k++) {
      T.stepSim(L);
      await new Promise(r => setTimeout(r, 40));
      const c = document.getElementById('screen');
      const x0 = Math.round((cx - 1 - T.state.cam) * 4), y0 = Math.round((cy - 15) * 4);
      const d = c.getContext('2d').getImageData(x0, y0, 64, 48).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] + d[i + 2]) | 0;
      hashes.push(h);
    }
    return 'CLIMB: state=climb x=' + cx + ' y=' + cy + ' distinct sprite hashes=' + new Set(hashes).size + ' of 8';
  })()`);
  console.log(climb);

  // --- animation check: floater (force float state with umbrella open, sample frames) ---
  const float = await evalJs(`(async () => {
    const T = window._lemTest;
    T.state.paused = true;
    ${setLevel(7)}
    const L = T.state.level;
    let target = null;
    for (let t = 0; t < 600 && !target; t++) {
      T.stepSim(L);
      target = T.state.lems.find(l => !l.dead && !l.rescued);
    }
    if (!target) return 'FLOAT: no lem';
    target.state = 'float'; target.fallN = 30; target.stT = target.tick; target.dir = 1;
    T.state.cam = Math.max(0, Math.min(L.W - 320, Math.round(target.x) - 160));
    const hashes = [];
    for (let k = 0; k < 8; k++) {
      T.stepSim(L);
      await new Promise(r => setTimeout(r, 40));
      const c = document.getElementById('screen');
      const x0 = Math.round((target.x - 1 - T.state.cam) * 4), y0 = Math.round((target.y - 15) * 4);
      const d = c.getContext('2d').getImageData(x0, y0, 64, 64).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] + d[i + 2]) | 0;
      hashes.push(h);
    }
    return 'FLOAT: x=' + Math.round(target.x) + ' y=' + Math.round(target.y) + ' fallN=' + target.fallN + ' distinct hashes=' + new Set(hashes).size + ' of 8';
  })()`);
  console.log(float);

  // --- selection highlight + click boxes ---
  const sel = await evalJs(`(async () => {
    const T = window._lemTest;
    T.state.paused = true;
    T.state.selSkill = 0;
    await new Promise(r => setTimeout(r, 60));
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 320 * 4, 40 * 4).data;
    const reds = [];
    for (let y = 16; y < 40; y++) for (let x = 0; x < 40; x++) {
      const i = ((y * 4) * 1280 + x * 4) * 4;
      if (d[i] > 200 && d[i + 1] < 80 && d[i + 2] < 80) reds.push(x);
    }
    const box = reds.length ? [Math.min.apply(null, reds), Math.max.apply(null, reds)] : null;
    // click mapping: button s art spans x 2+16s..17+16s (integers); MouseEvent truncates CSS coords
    const cv = document.getElementById('screen');
    const rect = cv.getBoundingClientRect();
    const rectInfo = 'rect w=' + rect.width + ' h=' + rect.height + ' vw=' + (window.innerWidth) + ' vh=' + (window.innerHeight);
    const clickAt = (px) => {
      const ev = new MouseEvent('click', { bubbles: true, clientX: Math.round(rect.left + px / 320 * rect.width), clientY: Math.round(rect.top + 175 / 200 * rect.height) });
      cv.dispatchEvent(ev);
    };
    clickAt(9.5);   // button 0 centre
    const s0 = T.state.selSkill;
    clickAt(25.5);  // button 1 centre
    const s1 = T.state.selSkill;
    clickAt(41.5);  // button 2 centre
    const s2 = T.state.selSkill;
    clickAt(121.5); // button 7 centre
    const s7 = T.state.selSkill;
    return rectInfo + ' | SELECT: red box x=' + JSON.stringify(box) + ' (expect ~[2,17]) | click b0=' + s0 + ' b1=' + s1 + ' b2=' + s2 + ' b7=' + s7;
  })()`);
  console.log(sel);

  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); process.exit(1); });



