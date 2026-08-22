// Throwaway audit: real-browser audio pipeline via CDP with a TRUSTED mouse gesture.
// Serves web/ as server root (regression for the ../build 404), checks:
//   boot: ctx suspended, driver queued, no exceptions
//   after trusted click: ctx running, samples rendered, music tempo live
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9224;
const URL = 'http://127.0.0.1:8339/index.html';

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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-audit-' + Date.now()),
    '--mute-audio', 'about:blank'
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
  if (!target) throw new Error('no target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let n = 1;
  const send = (m, p) => cdp(ws, n++, m, p);
  const evts = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled') evts.push('CONSOLE: ' + m.params.args.map(a => a.value).join(' '));
    if (m.method === 'Runtime.exceptionThrown') evts.push('EXCEPTION: ' + (m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : '?'));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Input.setIgnoreInputEvents', { ignore: false });
  await send('Page.navigate', { url: URL });
  await sleep(3000);
  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

  const boot = await evalJs(`(() => {
    const a = window._lemTest.audio;
    return { adlib: !!window.ADLIB, hasAudio: !!a, state: a.ctx ? a.ctx.state : 'NO-CTX',
             samplePos: a ? a.samplePos : -1, menuLen: document.getElementById('lvlsel').options.length,
             msg: document.getElementById('msg').textContent };
  })()`);

  const before = await evalJs(`(() => {
    const a = window._lemTest.audio;
    a.node.onaudioprocess._wrap = a.node.onaudioprocess._wrap || 0;
    if (!a.node.onaudioprocess._wrapped) {
      const orig = a.node.onaudioprocess;
      a.node.onaudioprocess._wrapped = true;
      a.node.onaudioprocess = function (e) {
        a.node.onaudioprocess._wrap = (a.node.onaudioprocess._wrap || 0) + 1;
        return orig.call(a, e);
      };
    }
    return { state: a.ctx.state, sp: a.samplePos, wrap: a.node.onaudioprocess._wrap };
  })()`);

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 200, y: 400, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 200, y: 400, button: 'left', clickCount: 1 });
  await sleep(3000);

  const after = await evalJs(`(() => {
    const a = window._lemTest.audio;
    const d = a.driver;
    return { state: a.ctx.state, sp: a.samplePos, wrap: a.node.onaudioprocess._wrap,
             b6b: d ? d.w(0x0b) : -1, b6a: d ? d.w(0x0d) : -1,
             muted: a.muted };
  })()`);

  console.log('boot:', JSON.stringify(boot));
  console.log('before-click:', JSON.stringify(before));
  console.log('after-click:', JSON.stringify(after));
  console.log('console/exception events:', evts.length ? JSON.stringify(evts.slice(0, 8)) : '(none)');
  ws.close();
  chrome.kill();
  const ok = boot.state === 'suspended' && boot.menuLen === 120 &&
             after.state === 'running' && after.wrap > 0 && after.sp > 0 &&
             evts.filter(e => e.startsWith('EXCEPTION')).length === 0;
  console.log(ok ? 'AUDIT PASS' : 'AUDIT FAIL');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });