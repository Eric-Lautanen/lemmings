// Screenshot FF chip (off state) closeup
'use strict';
import { spawn } from 'node:child_process';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9239;
const URL = 'file:///C:/github/Lemmings/index.html';
function cdp(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const pending = {};
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending[m.id]) {
        const p = pending[m.id];
        delete pending[m.id];
        if (m.error) p.reject(new Error(p.method + ': ' + JSON.stringify(m.error)));
        else p.resolve(m.result);
      }
    };
    pending[id] = { resolve, reject, method };
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--window-size=1400,1000', '--allow-file-access-from-files', 'about:blank'
], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const list = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json());
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
await cdp(ws, 1, 'Page.enable', {});
await cdp(ws, 2, 'Page.navigate', { url: URL });
await new Promise(r => setTimeout(r, 3500));
const rect = JSON.parse((await cdp(ws, 3, 'Runtime.evaluate', {
  expression: `JSON.stringify(document.getElementById('screen').getBoundingClientRect())`,
  returnByValue: true
})).result.value);
const scale = rect.width / 320;
await cdp(ws, 4, 'Input.dispatchMouseEvent', {
  type: 'mouseMoved',
  x: rect.left + 200 * scale, y: rect.top + 185 * scale
});
await new Promise(r => setTimeout(r, 300));
const clip = {
  x: rect.left,
  y: rect.top + rect.height * 160 / 200 - 6,
  width: rect.width * 0.62,
  height: rect.height * 40 / 200 + 14,
  scale: 2
};
const r5 = await cdp(ws, 5, 'Page.captureScreenshot', { format: 'png', clip });
fs.writeFileSync('build/ui_ffchip.png', Buffer.from(r5.data, 'base64'));
console.log('saved build/ui_ffchip.png');
ws.close();
chrome.kill();
process.exit(0);

