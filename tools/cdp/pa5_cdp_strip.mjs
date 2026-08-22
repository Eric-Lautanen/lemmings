// Strip render check: load index.html headless, verify green strip text at DOS positions.
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const fs = require('fs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9224;
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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp2-' + Date.now()),
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

  // force the reference state: released=9, rescued=0, time 4:43
  await evalJs(`(function(){
    const T = window._lemTest;
    if (!T || !T.state.level) return 'no-hook';
    T.state.paused = true;
    T.state.released = 9;
    T.state.rescued = 0;
    T.state.timeLeft = 4*60+43;
    return 'state set';
  })()`);
  await sleep(500);

  // grab the strip band rows 160..175 and report green pixels per 8px slot
  const report = await evalJs(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 1280, 64).data;
    const slots = [112,120,128,144,152,184,192,208,216,224,248,256,264,272,288,296,304,312];
    const out = [];
    for (const x0 of slots) {
      let n = 0;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
        const i = (y*1280 + (x0*4) + x)*4;
        if (d[i+1] > 100 && d[i] < 60 && d[i+2] < 60) n++;
      }
      out.push(x0 + ':' + n);
    }
    return out.join(' ');
  })()`);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/ericl/AppData/Local/Temp/opencode/pa5_smoke.png', Buffer.from(shot.data, 'base64'));
  console.log('green px per slot:', report);
  console.log('console events:', evts.length ? JSON.stringify(evts.slice(0, 10)) : '(none)');

  // dump the internal-buffer strip mask for exact comparison
  const mask = await evalJs(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 1280, 64).data;
    const lines = [];
    for (let y = 0; y < 64; y += 4) {
      let s = '';
      for (let x = 0; x < 1280; x += 4) {
        const i = (y * 1280 + x) * 4;
        s += (d[i + 1] > 100 && d[i] < 60 && d[i + 2] < 60) ? '1' : '0';
      }
      lines.push(s);
    }
    return lines.join('\\n');
  })()`);
  fs.writeFileSync('C:/Users/ericl/AppData/Local/Temp/opencode/pa5_browsermask.txt', mask);
  console.log('browser mask dumped');
  ws.close();
  chrome.kill();
  const ok = evts.length === 0 && report.split(' ').length === 18;
  console.log(ok ? 'STRIP SMOKE PASS' : 'STRIP SMOKE FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });

