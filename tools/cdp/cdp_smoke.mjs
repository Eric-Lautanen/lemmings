// Browser smoke test: load index.html in headless Chrome via CDP,
// verify the 120-slot menu dropdown, level load, and grab a screenshot.
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const fs = require('fs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9223;
const URL = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp-' + Date.now()),
    'about:blank'
  ]);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let target = null;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find(t => t.type === 'page');
    } catch (e) { /* not up yet */ }
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
  await sleep(2500);

  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
  const selOpts = await evalJs(`document.getElementById('lvlsel').options.length`);
  const sel0 = await evalJs(`document.getElementById('lvlsel').options[0].text`);
  const selLast = await evalJs(`document.getElementById('lvlsel').options[119] ? document.getElementById('lvlsel').options[119].text : 'NONE'`);
  const selVal = await evalJs(`document.getElementById('lvlsel').value`);
  const canvasPx = await evalJs(`(() => { const c = document.getElementById('screen'); const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data; let nz=0; for (let i=0;i<d.length;i+=4) if (d[i]||d[i+1]||d[i+2]) nz++; return nz; })()`);
  await evalJs(`document.getElementById('lvlsel').value = 30; document.getElementById('lvlsel').dispatchEvent(new Event('change'))`);
  await sleep(1500);
  const selVal2 = await evalJs(`document.getElementById('lvlsel').value`);
  const lvlName = await evalJs(`window._lemTest ? window._lemTest.state.level.name : 'NO-HOOK'`);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', 'build', 'smoke.png'), Buffer.from(shot.data, 'base64'));
  console.log('options:', selOpts, '| sel0:', JSON.stringify(sel0), '| sel119:', JSON.stringify(selLast));
  console.log('initial level:', selVal, '| after change:', selVal2, '| name:', JSON.stringify(lvlName));
  console.log('canvas non-black px:', canvasPx);
  console.log('console events:', evts.length ? JSON.stringify(evts.slice(0, 10)) : '(none)');
  ws.close();
  chrome.kill();
  const ok = selOpts === 120 && sel0.includes('Just dig') && selLast.includes('Rendezvous') && selVal2 === '30' && evts.length === 0;
  console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
