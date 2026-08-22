const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
function b64d(s) { var b = Buffer.from(s, 'base64'); var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b[i]; return u; }
function unpack4(d, w, h) { var px = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x += 2) { var b = d[y * ((w + 1) >> 1) + (x >> 1)]; px[y * w + x] = b >> 4; if (x + 1 < w) px[y * w + x + 1] = b & 15; } return px; }
const pan = unpack4(b64d(A.main.panel), 320, 40);
// light region (non-0) bounding boxes in x=120..318, y=26..39
function lightRects(x0, x1, y0, y1) {
  let rects = [];
  const seen = new Set();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (pan[y * 320 + x] === 0 || seen.has(x + ',' + y)) continue;
    // flood light region
    let stack = [[x, y]]; seen.add(x + ',' + y);
    let minX = x, maxX = x, minY = y, maxY = y;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      for (const [nx, ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]) {
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
        const k = nx + ',' + ny;
        if (!seen.has(k) && pan[ny * 320 + nx] !== 0) { seen.add(k); stack.push([nx, ny]); }
      }
    }
    rects.push([minX, minY, maxX, maxY]);
  }
  return rects.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
console.log(JSON.stringify(lightRects(130, 318, 26, 39)));
// big summary of the whole panel: light rects rows 0..39
console.log('full panel light rects (x0,y0,x1,y1):');
console.log(JSON.stringify(lightRects(0, 319, 0, 39)));