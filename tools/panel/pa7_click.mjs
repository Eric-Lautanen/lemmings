// Verify panel click mapping: skill buttons at 32+16k, Slower 0..15, Faster 16..31,
// Pause 160..175, Nuke 176..191
'use strict';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9236;
const URL = 'file:///C:/github/Lemmings/web/index.html';

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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp10-' + Date.now()),
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

  const result = await evalJs(`(async () => {
    const T = window._lemTest;
    const out = [];
    const s = document.getElementById('lvlsel'); s.value = '0'; s.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 150));
    T.state.paused = true;
    const cv = document.getElementById('screen');
    const rect = cv.getBoundingClientRect();
    const click = (px, py) => {
      const opts = {
        bubbles: true, cancelable: true, view: window,
        clientX: rect.left + Math.round(px * rect.width / 320),
        clientY: rect.top + Math.round(py * rect.height / 200)
      };
      cv.dispatchEvent(new MouseEvent('click', opts));
    };
    // skill buttons: centers at x = 32+16k+8, y = 180
    for (let k = 0; k < 8; k++) {
      T.state.selSkill = -1;
      click(40 + 16 * k, 180);
      out.push('b' + k + '=' + T.state.selSkill);
    }
    // rate buttons
    T.state.rate = 50;
    click(8, 180);  out.push('slower=' + T.state.rate);
    click(8, 180);  out.push('slower=' + T.state.rate);
    click(24, 180); out.push('faster=' + T.state.rate);
    // pause toggle
    const p0 = T.state.paused;
    click(168, 180); out.push('pause=' + (T.state.paused !== p0));
    click(168, 180); out.push('unpause=' + (T.state.paused === p0));
    // nuke: unpause and open the entrance so lems spawn
    T.state.paused = false;
    T.state.entrance = 1; T.state.entranceCD = 1;
    T.state.rate = 99;
    await new Promise(r => setTimeout(r, 1200));
    const alive0 = T.state.lems.filter(l => !l.dead && !l.rescued).length;
    const states0 = T.state.lems.map(l => l.state).join(',');
    click(184, 180);
    const bombers = T.state.lems.filter(l => l.state === 'bomber').length;
    T.state.pending = 0;   // no further spawns so the count settles
    await new Promise(r => setTimeout(r, 9000));
    const alive1 = T.state.lems.filter(l => !l.dead && !l.rescued).length;
    out.push('nuke=' + alive0 + '->' + alive1 + ' pre=' + states0 + ' bombers=' + bombers);
    return out.join(' ');
  })()`);
  console.log(result);
  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); process.exit(1); });