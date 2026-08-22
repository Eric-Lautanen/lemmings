import { spawn } from 'node:child_process';
import path from 'node:path';
console.log('step0: spawn chrome');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9233', '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp8-' + Date.now()), 'about:blank']);
chrome.on('error', e => console.log('chrome err', String(e)));
chrome.on('exit', c => console.log('chrome exit', c));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const watchdog = setTimeout(() => { console.log('HUNG'); process.exit(3); }, 30000);
(async () => {
  let t = null;
  for (let i = 0; i < 60 && !t; i++) {
    await sleep(250);
    try { const l = await (await fetch('http://127.0.0.1:9233/json/list')).json(); t = (l || []).find(x => x.type === 'page'); } catch (e) { if (i % 5 === 0) console.log('fetch retry', i); }
  }
  console.log('target', t ? t.url : 'NONE');
  if (!t) { chrome.kill(); process.exit(1); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  console.log('ws open');
  ws.addEventListener('message', ev => { console.log('RAWMSG type=' + typeof ev.data + ' ' + String(ev.data).slice(0, 120)); });
  let id = 1;
  const cdp = (m, p) => { const myId = id++; return new Promise((res, rej) => { const on = ev => { const x = JSON.parse(ev.data); if (x.id !== myId) return; ws.removeEventListener('message', on); x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result); }; ws.addEventListener('message', on); ws.send(JSON.stringify({ id: myId, method: m, params: p || {} })); }); };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  await cdp('Page.navigate', { url: 'file:///C:/github/Lemmings/web/index.html' });
  console.log('navigated');
  await sleep(4000);
  const expr = `(() => {
    const cv = document.getElementById('screen');
    const rect = cv.getBoundingClientRect();
    const T = window._lemTest;
    window.__probeLog = [];
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * 320;
      const py = (e.clientY - r.top) / r.height * 200;
      window.__probeLog.push({ cx: e.clientX, cy: e.clientY, left: r.left, top: r.top, w: r.width, h: r.height, px: px, py: py, k: Math.floor((px - 2) / 16) });
    }, true);
    const clickAt = (px) => {
      const ev = new MouseEvent('click', { bubbles: true, clientX: rect.left + px / 320 * rect.width, clientY: rect.top + 175 / 200 * rect.height });
      cv.dispatchEvent(ev);
      return T.state.selSkill;
    };
    const seq = [];
    seq.push(['18.1', clickAt(18.1)]);
    seq.push(['25.5', clickAt(25.5)]);
    return JSON.stringify({ seq: seq, probe: window.__probeLog });
  })()`;
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true });
  console.log('RESULT:', r.result.value);
  clearTimeout(watchdog);
  ws.close(); chrome.kill();
})().catch(e => { console.error('FATAL', e); clearTimeout(watchdog); process.exit(1); });