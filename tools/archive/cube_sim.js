'use strict';
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('C:/Users/ericl/Documents/cube.html', 'utf8');
const jsRaw = html.substring(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const js = jsRaw.replace(
  'statTimer -= dt;',
  '__dbg.o2 = o2; __dbg.plants = plants; __dbg.resp = resp; __dbg.motes = motes.length; __dbg.simTime = simTime; statTimer -= dt;'
);

function makeCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p in t) return t[p];
      return () => {
        return { addColorStop() {} };
      };
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}

const handlers = {};
const logs = [];
const els = {};
let seq = 0;

function makeEl(id) {
  const kids = [];
  let htmlStr = '';
  const el = {
    id, style: {}, hidden: false, disabled: false,
    textContent: '',
    classList: { add() {}, remove() {}, toggle() {} },
    get lastChild() { return { remove() { kids.pop(); } }; },
    nextElementSibling: { style: {} },
    appendChild(c) { kids.push(c); },
    prepend(c) { kids.unshift(c); if (logs.length < 8000 && c.innerHTML) logs.push(c.innerHTML); },
    remove() {},
    addEventListener(ev, fn) { (handlers[id + ':' + ev] ||= []).push(fn); },
    setPointerCapture() {},
    getContext() { return makeCtx(); },
    querySelectorAll() { return [] }
  };
  Object.defineProperty(el, 'innerHTML', {
    set(v) { htmlStr = v; kids.length = 0; const n = (v.match(/<[\w/]/g) || []).length; for (let i = 0; i < n; i++) kids.push({ style: {}, remove() {} }); },
    get() { return htmlStr; }
  });
  el.children = kids;
  return el;
}

const documentStub = {
  getElementById(id) { return els[id] ||= makeEl(id); },
  createElement() { return makeEl('dyn' + seq++); },
  querySelectorAll() { return []; }
};

const rafQueue = [];
const sandbox = {
  document: documentStub,
  addEventListener(e, f) { (handlers['win:' + e] ||= []).push(f); },
  innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
  window: { devicePixelRatio: 1 },
  requestAnimationFrame(f) { rafQueue.push(f); },
  setTimeout() { return 0; }, clearTimeout() {},
  console, performance
};
vm.createContext(sandbox);
sandbox.__dbg = {};
vm.runInContext(js, sandbox, { filename: 'cube.js' });

// start the sim
handlers['btnBegin:click'][0]();
// cycle the full speed ladder, verifying labels wrap correctly
for (let i = 0; i < 6; i++) {
  handlers['btnSpeed:click'][0]();
  console.log('speed label now:', els.btnSpeed.textContent);
}
// click until the label reads 1000x (max 14 to avoid infinite loop)
for (let i = 0; i < 14 && els.btnSpeed.textContent !== '1000\u00d7'; i++) handlers['btnSpeed:click'][0]();
console.log('stress speed:', els.btnSpeed.textContent);
const SPD = 1000;

let t = 0;
const FRAME = 1000 / 60;
if (!rafQueue.length) { console.log('no initial rAF'); process.exit(1); }
rafQueue.shift()(t); // bootstrap registers frame()

const FRAMES = 620; // 620 frames * 1000 steps * 1/60 s ~= 10300 sim-seconds
for (let i = 1; i <= FRAMES; i++) {
  t += FRAME;
  const cb = rafQueue.shift();
  if (!cb) { console.log('rAF chain broke at frame', i); break; }
  cb(t);
  if (i % 100 === 0) {
    const simSec = sandbox.__dbg.simTime.toFixed(0);
    console.log(
      `t=${simSec}s pop=${els.stPop.textContent} gen=${els.stGen.textContent} ` +
      `b/d=${els.stBD.textContent} pred=${els.stPred.textContent} land=${els.stLand.textContent} ` +
      `o2=${(sandbox.__dbg.o2 * 100).toFixed(2)}% plants=${sandbox.__dbg.plants} motes=${sandbox.__dbg.motes} ` +
      `resp=${(sandbox.__dbg.resp * 1000).toFixed(3)}m split=${els.stSplit.textContent} epoch=[${els.epoch.innerHTML}]`
    );
  }
}
console.log('\n--- log timeline (first 40 entries, chronological tail) ---');
console.log(logs.slice(-40).join('\n'));
