const fs = require('fs');
const vm = require('vm');
global.window = {};
vm.runInThisContext(fs.readFileSync('build/assets.js', 'utf8'), { filename: 'assets.js' });
const A = window.GAME_ASSETS;
console.log('main keys:', Object.keys(A.main).join(', '));
console.log('anim keys:', Object.keys(A.main.anims || {}).join(', '));
console.log('hud len:', A.main.hud.length, 'panel b64 len:', A.main.panel.length);
// panel icons?
if (A.main.icons) console.log('icons:', Array.isArray(A.main.icons) ? A.main.icons.length : 'obj');