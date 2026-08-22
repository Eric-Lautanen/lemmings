// Inspect the web's starting level + skill wells rendering
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9226;
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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp4-' + Date.now()),
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
  const evts = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled') evts.push(m.params.args.map(a => a.value).join(' '));
    if (m.method === 'Runtime.exceptionThrown') evts.push('EXCEPTION: ' + (m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : '?'));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: URL });
  await sleep(4000);

  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

  const info = await evalJs(`(() => {
    const T = window._lemTest;
    if (!T) return 'no hook';
    const L = T.state.level;
    if (!L) return 'no level';
    return JSON.stringify({
      levelName: L.name, skills: L.skills,
      released: T.state.released, rescued: T.state.rescued, timeLeft: T.state.timeLeft
    });
  })()`);
  console.log('level info:', info);

  const report = await evalJs(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 1280, 200).data;
    // panel rows 160..199 -> buffer y 640..800; wells ~art y27..35 -> buffer y 748..784
    const out = [];
    for (const s of [0,1,2,3,4,5,6,7]) {
      const x0 = 2 + s*16;
      for (const cc of [0,1]) {
        const gx = (x0 + cc*7) * 4;
        let n = 0;
        for (let y = 748; y < 784; y++) for (let x = gx; x < gx + 32; x++) {
          const i = (y*1280 + x)*4;
          if (d[i+1] > 100 && d[i] < 60 && d[i+2] < 60) n++;
        }
        out.push('s' + s + 'c' + cc + ':' + n);
      }
    }
    return out.join(' ');
  })()`);
  console.log('well green px (8 slots x 2 digits):', report);

  // also count green pixels per button well region art y27..35 (10px tall, full 16 wide)
  const report2 = await evalJs(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 1280, 200).data;
    const out = [];
    for (const s of [0,1,2,3,4,5,6,7]) {
      const x0 = 2 + s*16;
      let n = 0;
      for (let y = 744; y < 788; y++) for (let x = x0*4; x < (x0+16)*4; x++) {
        const i = (y*1280 + x)*4;
        if (d[i+1] > 100 && d[i] < 60 && d[i+2] < 60) n++;
      }
      out.push('s' + s + ':' + n);
    }
    return out.join(' ');
  })()`);
  console.log('button-well-region green px:', report2);

  console.log('console events:', evts.length ? JSON.stringify(evts.slice(0, 5)) : '(none)');
  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); process.exit(1); });
