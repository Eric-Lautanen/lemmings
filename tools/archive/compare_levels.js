const fs = require('fs');
const vm = require('vm');

// ---------------- original DOS level parser (from lemtools/extract.js) ----------------
function decompressSection(bytes, offset) {
  const numBits = bytes[offset];
  const dsize = (bytes[offset + 4] << 8) | bytes[offset + 5];
  const csize = (bytes[offset + 8] << 8) | bytes[offset + 9];
  const comp = bytes.slice(offset + 10, offset + csize);
  const out = new Uint8Array(dsize);
  let pos = dsize, bitPos = 0, curByte = comp.length - 1;
  function readBit() {
    if (bitPos >= (curByte === comp.length - 1 ? numBits : 8)) { curByte--; bitPos = 0; }
    return (comp[curByte] >> bitPos++) & 1;
  }
  function readBits(n) { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | readBit(); return v; }
  while (pos > 0) {
    if (readBit() === 0) {
      if (readBit() === 0) {
        const n = readBits(3);
        for (let i = 0; i < n + 1; i++) out[--pos] = readBits(8);
      } else {
        const off = readBits(8) + 1;
        for (let i = 0; i < 2; i++) { const idx = pos - 1; out[idx] = out[idx + off]; pos--; }
      }
    } else {
      if (readBit() === 0) {
        if (readBit() === 0) {
          const off = readBits(9) + 1;
          for (let i = 0; i < 3; i++) { const idx = pos - 1; out[idx] = out[idx + off]; pos--; }
        } else {
          const off = readBits(10) + 1;
          for (let i = 0; i < 4; i++) { const idx = pos - 1; out[idx] = out[idx + off]; pos--; }
        }
      } else {
        if (readBit() === 0) {
          const L = readBits(8) + 1;
          const off = readBits(12) + 1;
          for (let i = 0; i < L; i++) { const idx = pos - 1; out[idx] = out[idx + off]; pos--; }
        } else {
          const n = readBits(8);
          for (let i = 0; i < n + 9; i++) out[--pos] = readBits(8);
        }
      }
    }
  }
  return { data: out, nextOffset: offset + csize };
}
function decompressFile(name) {
  const bytes = fs.readFileSync('C:/github/Lemmings/original/' + name);
  const sections = [];
  let off = 0;
  while (off < bytes.length) { const s = decompressSection(bytes, off); sections.push(s.data); off = s.nextOffset; }
  return sections;
}

const sec = decompressFile('level000.dat')[2]; // Fun 3 = section 2
const name = String.fromCharCode(...sec.slice(0x7E0, 0x7E0 + 32)).replace(/[^\x20-\x7e]/g, '.');
console.log('section name: "' + name + '"');
console.log('raw bytes @0x120..0x12F: ' + Array.from(sec.slice(0x120, 0x130)).map(b => b.toString(16).padStart(2, '0')).join(' '));
// terrain pieces: 0x120 + i*4, value: x = ((v>>16)&0xFFF)-16; y: (v>>7)&0x1FF then y>256? y-516 : y-4; id = v&0x3F; flags = (v>>>29)&7
const terr = [];
for (let i = 0; i < 400; i++) {
  const o = 0x120 + i * 4;
  const v = ((sec[o] & 0xFF) << 24) | ((sec[o + 1] & 0xFF) << 16) | ((sec[o + 2] & 0xFF) << 8) | (sec[o + 3] & 0xFF);
  if (v == 0xFFFFFFFF) break;
  const x = ((v >> 16) & 0x0FFF) - 16;
  const yv = (v >> 7) & 0x1FF;
  const y = yv - (yv > 256 ? 516 : 4);
  const id = v & 0x3F;
  const flags = (v >>> 29) & 0x7;
  terr.push({ i, x, y, id, flags: { erase: !!(flags & 1), up: !!(flags & 2), noow: !!(flags & 4) } });
}
// objects: 0x20 + i*8; x = ((b0<<8)|b1)-16 ; y = (b2<<8)|b3; id = (b4<<8)|b5; mod = b6
const objs = [];
for (let i = 0; i < 32; i++) {
  const o = 0x20 + i * 8;
  const x = ((sec[o] << 8) | sec[o + 1]) - 16;
  const y = (sec[o + 2] << 8) | sec[o + 3];
  const id = (sec[o + 4] << 8) | sec[o + 5];
  const mods = sec[o + 6];
  if (sec[o + 6] === 0 && sec[o + 7] === 0) break;
  objs.push({ i, x, y, id, mods: mods.toString(16).padStart(2, '0') });
}
console.log('--- DOS level000 sec2 (Fun 3 "Tailor-made for blockers") ---');
console.log('terrain pieces: ' + terr.length);
for (const t of terr) {
  console.log(`  [${String(t.i).padStart(3)}] id=${String(t.id).padStart(2)} x=${String(t.x).padStart(4)} y=${String(t.y).padStart(3)} ${JSON.stringify(t.flags)}`);
}
console.log('objects: ' + objs.length);
for (const o of objs) console.log(`  [${String(o.i).padStart(2)}] id=${String(o.id).padStart(2)} x=${String(o.x).padStart(4)} y=${String(o.y).padStart(3)} mods=0x${o.mods}`);

// ---------------- port level ----------------
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('C:/github/Lemmings/build/assets.js', 'utf8'), ctx);
const A = ctx.window.GAME_ASSETS;
console.log('--- PORT menu entry idx 2 ---');
const me = A.menu[2];
console.log('name:', me.name, 'gfxset:', me.gfxset || '?');
const lv = A.levels[2];
console.log('level terrain entries: ' + lv.terrain.length);
for (let i = 0; i < lv.terrain.length; i++) {
  const te = lv.terrain[i];
  console.log(`  [${String(i).padStart(3)}] id=${String(te[3]).padStart(2)} x=${String(te[0]).padStart(4)} mods=0x${('00' + (te[1] || 0).toString(16)).slice(-2)} y=${String(Math.round(te[2])).padStart(3)}`);
}
console.log('level objects: ' + lv.objs.length);
for (let i = 0; i < lv.objs.length; i++) {
  const o = lv.objs[i];
  console.log(`  [${String(i).padStart(2)}] id=${String(o[2]).padStart(2)} x=${String(o[0]).padStart(4)} y=${String(o[1]).padStart(3)} mods=0x${('00' + (o[3] || 0).toString(16)).slice(-2)}`);
}