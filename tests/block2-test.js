// 빈쿠션 시스템 — 제2적구가 '출발 경로'를 막는 배치 검증
// 회귀 대상: targetBlocksPath()가 t<=0.05를 건너뛰는 바람에, 수구 바로 앞에
// 붙은 제2적구(= 가장 확실히 먼저 맞는 위치)를 놓치고 '득점 라인'이라고
// 알려주던 버그. 파이브앤하프 예시 배치가 정확히 그 상황이었다.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
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
    querySelectorAll() { return []; },
    getContext() { return ctxProxy(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: w || 100, height: h || 100 }; },
  };
}
const tabBtns = ['five', 'plus', 'ball'].map(sys => { const b = mkEl('tab-' + sys); b.dataset.sys = sys; return b; });
const tipBtns = [1, 2, 3].map(t => { const b = mkEl('tip-' + t); b.dataset.tip = String(t); return b; });
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) {
    if (sel === '#g3-tabs button') return tabBtns;
    if (sel === '#g3-tipseg button') return tipBtns;
    return [];
  },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {} };
eval(code);

const strip = () => els['g3-result'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };

// 좌표계는 index.html과 동일 (W=860,H=460,M=44)
const play = { x0: 44, y0: 44, x1: 816, y1: 416 };
const DX = (play.x1 - play.x0) / 8, DY = (play.y1 - play.y0) / 4;

// --- 1) 예시 배치는 실제로 칠 수 있는 배치여야 한다 ---
// (예전 프리셋은 제2적구가 수구 바로 앞이라 쿠션 전에 먼저 맞는 배치였다)
handlers['g3-example:click'][0]();
const out1 = strip();
check('예시 배치가 득점 라인을 낸다', /득점 라인/.test(out1));
check('  └ 예시 배치에 출발-경로 차단 경고가 없다', !/제2적구.*출발 경로/.test(out1));

// --- 2) 제2적구를 수구 바로 앞(출발 경로 위)에 두면 경고해야 한다 ---
// 회귀 지점: t<=0.05 가드가 이 구간을 통째로 건너뛰어 '득점 라인'이라고 했다.
// (mouseup은 window에 걸려 있어 스텁이 삼킨다 — block-test.js와 같이 down+move만 쓴다)
const TG0 = { x: play.x1 - DX * 3.6, y: play.y1 - DY * 0.4 };    // 예시의 제2적구 자리
handlers['g3-table:mousedown'][0](ev(TG0.x, TG0.y));
handlers['g3-table:mousemove'][0](ev(play.x1 - DX * 1.2, play.y1 - DY * 0.8));
handlers['g3-calc:click'][0]();
const out2 = strip();
check('수구 바로 앞의 제2적구를 차단으로 경고한다', /제2적구.*출발 경로/.test(out2));
check('  └ 차단 시 초록 득점 라인을 띄우지 않는다', !/득점 라인/.test(out2));

// --- 3) 수구 뒤쪽(반대편)의 제2적구는 차단이 아니다 ---
// 출발 방향은 좌상단이므로 수구의 우하단(코너 쪽)에 두면 t<0 → 경고 없어야 한다
handlers['g3-table:mousedown'][0](ev(play.x1 - DX * 1.2, play.y1 - DY * 0.8));
handlers['g3-table:mousemove'][0](ev(play.x1 - DX * 0.25, play.y1 - DY * 0.12));
handlers['g3-calc:click'][0]();
check('수구 뒤에 있는 제2적구는 차단으로 보지 않는다', !/제2적구.*출발 경로/.test(strip()));

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n제2적구 출발-경로 차단 검사 통과');
