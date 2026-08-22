// UI verification: screenshot the full page + panel closeup, check fast-button
// highlight, tooltip rendering, and count-cell scaling.
'use strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const __dirname = import.meta.dirname || '.';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9231;
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
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--window-size=1400,1000', '--allow-file-access-from-files', 'about:blank'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2500));
const list = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json());
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

await cdp(ws, 1, 'Page.enable', {});
await cdp(ws, 2, 'Runtime.enable', {});
await cdp(ws, 3, 'Page.navigate', { url: URL });
await new Promise(r => setTimeout(r, 3500));

// let audio unlock + game boot; move mouse over a skill button to trigger tooltip
const evalJs = async (expr) => {
  const r = await cdp(ws, Math.floor(Math.random() * 1e6), 'Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result.value;
};

console.log('boot:', await evalJs(`window._lemTest ? 'ok' : 'MISSING'`));

// toggle fast via key event -> button should get .active class
await cdp(ws, 10, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70 });
await cdp(ws, 11, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'f', code: 'KeyF' });
await new Promise(r => setTimeout(r, 300));
console.log('fast active class:', await evalJs(`document.getElementById('speed').className`));
console.log('fast label:', await evalJs(`document.getElementById('speed').textContent`));
await cdp(ws, 12, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70 });
await cdp(ws, 13, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'f', code: 'KeyF' });

// hover over the builder skill button (canvas coords ~ (108,180) game px)
// canvas is scaled to fit; compute device coords via rect
const rect = await evalJs(`JSON.stringify(document.getElementById('screen').getBoundingClientRect())`);
const R = JSON.parse(rect);
const scale = R.width / 320;
const hx = R.left + 100 * scale, hy = R.top + 185 * scale;
await cdp(ws, 14, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: hx, y: hy });
await new Promise(r => setTimeout(r, 300));
await cdp(ws, 15, 'Page.captureScreenshot', { format: 'png' }).then(r => {
  fs.writeFileSync('build/ui_full.png', Buffer.from(r.data, 'base64'));
});

// crop panel region screenshot for closeup
const clip = { x: R.left, y: R.top + (R.height * 160 / 200) - 8, width: R.width, height: R.height * 40 / 200 + 16, scale: 1 };
await cdp(ws, 16, 'Page.captureScreenshot', { format: 'png', clip }).then(r => {
  fs.writeFileSync('build/ui_panel.png', Buffer.from(r.data, 'base64'));
});
console.log('screenshots written: build/ui_full.png, build/ui_panel.png');
ws.close();
chrome.kill();
process.exit(0);

