// 제1적구가 파이브앤하프 경로를 막는 경우 경고 확인
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

// 기본은 시스템 미선택(물리 우선)이므로 파이브앤하프를 켜고 검사한다.
global.window.__hb3test.setSystem('five');
// 예시 배치 로드 후 제1적구를 계산 경로 위로 드래그.
// 경로 위 좌표는 하드코딩하지 않고 실제 계산 결과에서 가져온다 — 예시 배치를
// 옮기면 경로도 바뀌므로, 좌표를 박아 두면 테스트가 의미 없이 깨진다.
handlers['g3-example:click'][0]();
const { balls, sol } = global.window.__hb3test;
const path = sol().path;                              // [수구, 1쿠션, 2쿠션, ...]
const onPath = { x: (path[0].x + path[1].x) / 2, y: (path[0].y + path[1].y) / 2 };
const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
handlers['g3-table:mousedown'][0](ev(balls.obj.x, balls.obj.y));   // obj 잡기
handlers['g3-table:mousemove'][0](ev(onPath.x, onPath.y));         // 출발 경로 위로
handlers['g3-calc:click'][0]();
const out = els['g3-result'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
console.log('경고 포함:', /제1적구.*경로 위/.test(out) ? 'OK' : 'FAIL');
console.log(out.slice(0, 200));
