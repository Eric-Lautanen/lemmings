// Verify web well digits against vgalemmi_004/002 DOS reference shape
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9227;
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
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'lem-cdp5-' + Date.now()),
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
  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

  const info = await evalJs(`(() => {
    const T = window._lemTest;
    return JSON.stringify({ name: T.state.level.name, skills: T.state.level.skills });
  })()`);
  console.log('level:', info);

  const rep = await evalJs(`(() => {
    const c = document.getElementById('screen');
    const d = c.getContext('2d').getImageData(0, 640, 1280, 200).data;
    const out = [];
    for (let s = 0; s < 8; s++) {
      const x0 = (3 + s * 16) * 4;
      const lines = [];
      for (let y = 184; y < 200; y++) {
        let line = '';
        for (let x = 0; x < 14; x++) {
          const i = ((y * 4 - 640) * 1280 + x0 + x * 4) * 4;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (g > 100 && r < 60 && b < 60) line += 'G';
          else if (r > 230 && g > 190 && b > 190) line += 'W';
          else line += '.';
        }
        lines.push(line);
      }
      out.push('B' + s + ' ' + lines.join('\\n'));
    }
    return out.join('\\n\\n');
  })()`);
  console.log(rep);
  ws.close();
  chrome.kill();
}
main().catch(e => { console.error(e); process.exit(1); });
