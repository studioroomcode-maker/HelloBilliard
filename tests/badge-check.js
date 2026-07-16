// gather 배지 마크업 직접 확인
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
  // 재구성된 카드: 히어로 성공률(.rc-pct + '성공률') + 공 모임(.rc-sub)
  const hasHero = /class="rc-pct"/.test(out) && /성공률/.test(out);
  const hasGather = /공 모임/.test(out);
  console.log('히어로 성공률 포함:', hasHero ? 'OK' : 'FAIL');
  console.log('gather 배지 포함:', hasGather ? 'OK' : 'FAIL');
}, 100);
