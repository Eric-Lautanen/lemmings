'use strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9238;
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
(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + PORT, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp12-' + Date.now()), 'about:blank']);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let target = null;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); target = list.find(t => t.type === 'page'); } catch (e) { } }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let n = 1; const send = (m, p) => cdp(ws, n++, m, p);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'file:///C:/github/Lemmings/web/index.html' });
  await sleep(4000);
  const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  console.log(await ev(`(async () => {
    const T = window._lemTest;
    const s = document.getElementById('lvlsel'); s.value = '0'; s.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 150));
    T.state.paused = false;
    T.state.entrance = 1; T.state.entranceCD = 1; T.state.rate = 99;
    await new Promise(r => setTimeout(r, 1200));
    T.state.pending = 0;
    const t0 = T.state.tick;
    const timers0 = T.state.lems.map(l => l.timer).join(',');
    // nuke directly (bypassing click) to isolate engine vs input
    for (const l of T.state.lems) if (!l.dead && !l.rescued) { l.state = 'bomber'; l.timer = 120; }
    await new Promise(r => setTimeout(r, 3000));
    const t1 = T.state.tick;
    const timers1 = T.state.lems.map(l => l.timer).join(',');
    const states = T.state.lems.map(l => l.state).join(',');
    const alive = T.state.lems.filter(l => !l.dead && !l.rescued).length;
    return 'tick ' + t0 + '->' + t1 + ' timers ' + timers0 + ' -> ' + timers1 + ' states=' + states + ' alive=' + alive;
  })()`));
  ws.close(); chrome.kill();
})().catch(e => { console.error(e); process.exit(1); });