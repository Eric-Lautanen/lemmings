// 100% strip path check: released=9, rescued=9 -> IN 100% must be '1'@200 '0'@208 '0'@216 '%'@224
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const fs = require('fs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9225;
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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp3-' + Date.now()),
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

  await evalJs(`(function(){
    const T = window._lemTest;
    if (!T || !T.state.level) return 'no-hook';
    T.state.paused = true;
    T.state.released = 9;
    T.state.rescued = 9;
    T.state.timeLeft = 4*60+43;
    return 'state set';
  })()`);
  await sleep(500);

  const report = await evalJs(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 1280, 64).data;
    const slots = [192,200,208,216,224,232,240];
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

  console.log('green px (slots 192..240):', report);
  console.log('console events:', evts.length ? JSON.stringify(evts.slice(0, 10)) : '(none)');
  ws.close();
  chrome.kill();
  const expect = { 192: 1, 200: 1, 208: 1, 216: 1, 224: 1, 232: 0, 240: 0 }; // 192 = 'N' of IN
  const parts = Object.fromEntries(report.split(' ').map(s => { const [k, v] = s.split(':'); return [Number(k), Number(v)]; }));
  const ok = evts.length === 0 && Object.keys(expect).every(k => (parts[k] > 0) === (expect[k] > 0));
  console.log(ok ? 'STRIP 100% PASS' : 'STRIP 100% FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
