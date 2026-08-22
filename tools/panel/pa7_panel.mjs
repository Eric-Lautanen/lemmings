// Render web panel at capture-matching states, dump panel regions for diff.
// State A = vgalemmi_002 (Fun 1: 10 diggers, digger selected, OUT 9, TIME 4-43, rate 50)
// State B = vgalemmi_004 (Fun 2: 10 floaters, floater selected, OUT 9, TIME 4-43, rate 50)
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9235;
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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp9-' + Date.now()),
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

  // [menuIdx, selSkill, released, rate, timeLeft]
  for (const [idx, sel, out, rate, tl] of [[0, 7, 5, 50, 290], [1, 1, 9, 50, 283]]) {
    const result = await evalJs(`(async () => {
      const T = window._lemTest;
      const s = document.getElementById('lvlsel'); s.value = '${idx}'; s.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 150));
      T.state.paused = true;
      T.state.released = ${out};
      T.state.rescued = 0;
      T.state.timeLeft = ${tl};
      T.state.rate = ${rate};
      T.state.selSkill = ${sel};
      T.state.level.skills[${sel}] = 9;   // capture: one lem already used the skill
      T.state.cam = 0;
      await new Promise(r => setTimeout(r, 150));
      const c = document.getElementById('screen');
      const d = c.getContext('2d').getImageData(0, 640, 1280, 160).data;
      // 4x downscale nearest -> 320x40
      const rgb = new Uint8ClampedArray(320 * 40 * 3);
      for (let y = 0; y < 40; y++) for (let x = 0; x < 320; x++) {
        const i = ((y * 4) * 1280 + x * 4) * 4;
        rgb[(y * 320 + x) * 3] = d[i]; rgb[(y * 320 + x) * 3 + 1] = d[i + 1]; rgb[(y * 320 + x) * 3 + 2] = d[i + 2];
      }
      return Array.from(rgb).join(',');
    })()`);
    writeFileSync(path.join('C:/github/Lemmings/tools/panel', 'web_panel_' + idx + '.raw'), result);
    console.log('panel ' + idx + ' raw written, bytes:', result.length);
  }
  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); process.exit(1); });