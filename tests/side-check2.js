// 두께 좌/우 표기 확인 — 수구를 적구1 왼쪽/오른쪽에 두고 각각 계산
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
const handlers = {}, els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [892, 492] };
const ctxProxy = () => new Proxy({}, {
  get: (t, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} })
    : k === 'measureText' ? (s) => ({ width: String(s).length * 6 })
    : (...a) => {},
  set: () => true,
});
function mkEl(id) {
  const [w, h] = CANVAS_SIZE[id] || [0, 0];
  return {
    id, innerHTML: '', textContent: '', style: {}, dataset: {}, disabled: false,
    width: w, height: h,
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(ev, fn) { (handlers[id + ':' + ev] = handlers[id + ':' + ev] || []).push(fn); },
    click() { (handlers[id + ':click'] || []).forEach(f => f()); },
    querySelectorAll() { return []; },
    getContext() { return ctxProxy(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: w || 100, height: h || 100 }; },
  };
}
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll() { return []; },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {} };
eval(code);
handlers['g4-calc:click'][0]();
setTimeout(() => {
  const out = els['g4-routes'].innerHTML;
  const sides = [...out.matchAll(/mval">((?:왼쪽|오른쪽) \d\/8[^<]*|8\/8[^<]*)</g)].map(m => m[1]);
  console.log('두께 표기:', sides);
  const svgR = [...out.matchAll(/fill="#f7f4ea" stroke="#cfc8b4"/g)].length;
  console.log('두께 SVG 수:', svgR, '· 좌/우 라벨 포함 여부:', sides.length > 0 ? 'OK' : 'FAIL');
}, 3000);
