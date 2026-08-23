// Screenshot Fun 22 (special graphics level)
'use strict';
import { spawn } from 'node:child_process';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9241;
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
// jump to Fun 22
const r3 = await cdp(ws, 3, 'Runtime.evaluate', {
  expression: `(function(){ const T = window._lemTest; T.resetLevel(21); var s = document.getElementById('lvlsel'); s.value = '21'; return T.state.level.idx; })()`,
  returnByValue: true
});
console.log('jumped to:', r3.result.value);
await new Promise(r => setTimeout(r, 4000)); // let lemmings drop and walk
const r4 = await cdp(ws, 4, 'Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('build/ui_fun22.png', Buffer.from(r4.data, 'base64'));
console.log('saved build/ui_fun22.png');
ws.close();
chrome.kill();
process.exit(0);
