// Verify: localStorage persistence (level/music/sfx), prev/next buttons,
// fast-forward reset on map change, dropdown sync after reload.
'use strict';
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9237;
const URL = 'file:///C:/github/Lemmings/index.html';

let _seq = 1000;
const _pending = {};
function cdp(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    _pending[id] = { resolve, reject, method };
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function wireWs(ws) {
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && _pending[m.id]) {
      const p = _pending[m.id];
      delete _pending[m.id];
      if (m.error) p.reject(new Error(p.method + ': ' + JSON.stringify(m.error)));
      else p.resolve(m.result);
    }
  };
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--window-size=1400,1000', '--allow-file-access-from-files', 'about:blank'
], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const list = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json());
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
wireWs(ws);
await new Promise(r => ws.onopen = r);

const ev2 = async (expr) => {
  const r = await cdp(ws, Math.floor(Math.random() * 1e9), 'Runtime.evaluate',
    { expression: expr, returnByValue: true });
  return r.result.value;
};

await cdp(ws, 1, 'Page.enable', {});
await cdp(ws, 2, 'Page.navigate', { url: URL });
await new Promise(r => setTimeout(r, 3500));
console.log('boot:', await ev2(`!!window._lemTest`));

// pick level 12, turn music off
await ev2(`window.setMusicBtn(window._lemTest.audio.toggleMusic())`);
await ev2(`window._lemTest.state.fast = true`);
await ev2(`document.getElementById('next').click()`); // -> lvl 1 with fast on
await ev2(`(function(){ const T = window._lemTest; for (let i=0;i<10;i++) T.stepSim(T.state.level); return T.state.level.idx; })()`);
// jump to 12 via gotoLevel through the dropdown API
await ev2(`(function(){ var s=document.getElementById('lvlsel'); s.value='12'; s.dispatchEvent(new Event('change')); })()`);
await new Promise(r => setTimeout(r, 300));
console.log('lvl set:', await ev2(`window._lemTest.state.level.idx`),
  '| music:', await ev2(`window._lemTest.audio.musicOn`),
  '| localStorage:', await ev2(`localStorage.getItem('lemmings.level')`));

// RELOAD -> settings should restore incl. dropdown
await cdp(ws, 3, 'Page.reload', {});
await new Promise(r => setTimeout(r, 3500));
console.log('after reload:');
console.log('  level idx:', await ev2(`window._lemTest.state.level.idx`), '(want 12)');
console.log('  dropdown :', await ev2(`document.getElementById('lvlsel').value`), '(want 12)');
console.log('  music off:', await ev2(`!window._lemTest.audio.musicOn`), '(want true)');
console.log('  music lbl:', await ev2(`document.getElementById('music').textContent`));
console.log('  fast off :', await ev2(`!window._lemTest.state.fast`), '(want true)');

// prev/next buttons
await ev2(`document.getElementById('next').click()`);
console.log('next click ->', await ev2(`window._lemTest.state.level.idx`), '(want 13), sel:',
  await ev2(`document.getElementById('lvlsel').value`));
await ev2(`document.getElementById('prev').click()`);
await ev2(`document.getElementById('prev').click()`);
console.log('prev x2   ->', await ev2(`window._lemTest.state.level.idx`), '(want 11)');

ws.close();
chrome.kill();
process.exit(0);

