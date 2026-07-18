// 공 겹침 검증 회귀 테스트
//  1) overlappingBalls 순수 함수 — 지름 미만 근접/정확 겹침 탐지, 떨어진 배치는 null
//  2) 통합 — 적구1을 수구 위로 드래그한 뒤 '경로 3개 제안'을 누르면 계산이 막히고 경고 표시
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
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
const tabBtns = ['five', 'plus', 'ball'].map(sys => { const b = mkEl('tab-' + sys); b.dataset.sys = sys; return b; });
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) { return sel === '#g3-tabs button' ? tabBtns : []; },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {} };
eval(code);

let ok = true;
function check(name, cond) { console.log((cond ? 'OK   ' : 'FAIL ') + name); if (!cond) ok = false; }

// ── 1) 순수 함수 ──
const fn = global.window.__hbOverlap;
check('overlappingBalls 노출', typeof fn === 'function');
if (typeof fn === 'function') {
  const R = 8.8;
  const exact = { cue: { x: 100, y: 100 }, cue2: { x: 400, y: 100 }, r1: { x: 100, y: 100 }, r2: { x: 600, y: 200 } };
  const pair = fn(exact, R);
  check('정확히 겹친 두 공 탐지', Array.isArray(pair) && pair.includes('cue') && pair.includes('r1'));
  const near = { cue: { x: 100, y: 100 }, cue2: { x: 400, y: 100 }, r1: { x: 100 + R, y: 100 }, r2: { x: 600, y: 200 } };
  check('지름 미만 근접 탐지', !!fn(near, R));
  const apart = { cue: { x: 100, y: 100 }, cue2: { x: 400, y: 100 }, r1: { x: 100 + 3 * R, y: 100 }, r2: { x: 600, y: 200 } };
  check('충분히 떨어진 배치는 null', fn(apart, R) === null);
}

// ── 2) 통합: 적구1을 수구 위로 드래그 → 계산 차단 ──
const ev = (x, y) => ({ clientX: x, clientY: y, touches: null, preventDefault() {} });
// 기본 배치: 적구1(228,230) / 수구(216,252). 적구1을 잡아 수구 위로 이동.
handlers['g4-table:mousedown'][0](ev(228, 230));   // 적구1 잡기
handlers['g4-table:mousemove'][0](ev(216, 252));   // 수구 위로 (겹침)
handlers['g4-calc:click'][0]();                    // 계산 시도
const box = (els['g4-routes'].innerHTML || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
check('겹침 시 계산 차단·경고 표시', /겹쳐 있습니다/.test(box));

console.log(ok ? '겹침 검증 회귀: OK' : '겹침 검증 회귀: FAIL');
process.exit(ok ? 0 : 1);
