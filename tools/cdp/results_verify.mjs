// Visual verification: results overlay (win/lose), FF chip, pause outline
'use strict';
import { spawn } from 'node:child_process';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9233;
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
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let mid = 1;
const evalJs = async (expr) => {
  const r = await cdp(ws, ++mid, 'Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result.value;
};
const shot = async (name) => {
  const r = await cdp(ws, ++mid, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('build/' + name, Buffer.from(r.data, 'base64'));
};

await cdp(ws, ++mid, 'Page.enable', {});
await cdp(ws, ++mid, 'Page.navigate', { url: URL });
await new Promise(r => setTimeout(r, 3500));
console.log('boot:', await evalJs(`window._lemTest ? 'ok' : 'MISSING'`));

// force a WIN state
console.log('force win:', await evalJs(`(function(){ const T=window._lemTest; T.state.rescued = T.state.level.rescueNeed; T.state.over='win'; return 'set'; })()`));
await new Promise(r => setTimeout(r, 400));
await shot('ui_results_win.png');

// hover NEXT button to check highlight
const rect = JSON.parse(await evalJs(`JSON.stringify(document.getElementById('screen').getBoundingClientRect())`));
const scale = rect.width / 320;
// OVER_BTNS are rebuilt per draw; probe coordinates via canvas click at expected spot
const btnY = rect.top + ((100 - 59 + 90) / 200) * rect.height; // y0=(160-118)/2=21; btn y=y0+118-28=111..131 -> center 121
await evalJs(`(function(){ const T=window._lemTest; T.state.mx = ${((rect.left + rect.width/2 + 40*scale - rect.left)/scale).toFixed(1)}; T.state.my = ${(121).toFixed(1)}; return 'hover-set'; })()`);
await new Promise(r => setTimeout(r, 300));
await shot('ui_results_hover.png');

// force LOSE state
await evalJs(`(function(){ const T=window._lemTest; T.state.over='lose'; return 'set'; })()`);
await new Promise(r => setTimeout(r, 300));
await shot('ui_results_lose.png');

// clear over; test pause outline + FF chip click
await evalJs(`(function(){ const T=window._lemTest; T.state.over=null; T.state.paused=true; return 'paused'; })()`);
await new Promise(r => setTimeout(r, 200));
await shot('ui_pause.png');
await evalJs(`(function(){ const T=window._lemTest; T.state.paused=false; return 'unpaused'; })()`);

// click the FF chip directly (game coords x=201,y=185)
const fx = rect.left + 201 * scale, fy = rect.top + 185 * scale;
await cdp(ws, ++mid, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: fx, y: fy });
await cdp(ws, ++mid, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: fx, y: fy, button: 'left', clickCount: 1 });
await cdp(ws, ++mid, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: fx, y: fy, button: 'left', clickCount: 1 });
await new Promise(r => setTimeout(r, 200));
console.log('fast after chip click:', await evalJs(`window._lemTest.state.fast`));
console.log('tooltip visible state.mouseOn:', await evalJs(`window._lemTest.state.mouseOn`));
await shot('ui_ff_on.png');

ws.close();
chrome.kill();
process.exit(0);

