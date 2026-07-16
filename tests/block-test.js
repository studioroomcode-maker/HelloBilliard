// 제1적구가 파이브앤하프 경로를 막는 경우 경고 확인
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
const handlers = {}, els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [860, 460] };
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
const tabBtns = ['five','plus','ball'].map(sys => {
  const b = mkEl('tab-' + sys); b.dataset.sys = sys; return b;
});
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) { return sel === '#g3-tabs button' ? tabBtns : []; },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {} };
eval(code);

// 예시 배치 로드 후 제1적구를 계산 경로 위로 드래그
handlers['g3-example:click'][0]();
// 예시 five: 1쿠션 ≈ 32 지점 (상단 x≈219) — 경로 첫 구간 위에 obj 배치
// 수구 (x1-96.5, y1-51) → p1 (219,44): 중간점 근처 (500, 240)쯤이 경로 위
// 정확히: 경로 위 점을 못 맞춰도 세그먼트 2R 이내면 됨. 수구→p1 중간: ((719.5+219)/2, (365+44)/2)=(469,205)
const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
handlers['g3-table:mousedown'][0](ev(237, 230));      // obj 잡기 (기본 위치)
handlers['g3-table:mousemove'][0](ev(469, 205));      // 경로 위로
handlers['g3-calc:click'][0]();
const out = els['g3-result'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
console.log('경고 포함:', /제1적구.*경로 위/.test(out) ? 'OK' : 'FAIL');
console.log(out.slice(0, 200));
