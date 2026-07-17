// 빈쿠션 시스템 — 제2적구가 '출발 경로'를 막는 배치 검증
// 회귀 대상: targetBlocksPath()가 t<=0.05를 건너뛰는 바람에, 수구 바로 앞에
// 붙은 제2적구(= 가장 확실히 먼저 맞는 위치)를 놓치고 '득점 라인'이라고
// 알려주던 버그. 파이브앤하프 예시 배치가 정확히 그 상황이었다.
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

// 기본은 시스템 미선택이므로 파이브앤하프를 켜고 검사한다.
global.window.__hb3test.setSystem('five');
// --- 1) 예시 배치는 실제로 칠 수 있는 배치여야 한다 ---
// (예전 프리셋은 제2적구가 수구 바로 앞이라 쿠션 전에 먼저 맞는 배치였다)
handlers['g3-example:click'][0]();
const out1 = strip();
check('예시 배치가 득점 라인을 낸다', /득점 라인/.test(out1));
check('  └ 예시 배치에 출발-경로 차단 경고가 없다', !/제2적구.*출발 경로/.test(out1));

// 배치와 경로는 앱에서 직접 읽는다 — 좌표를 박아 두면 예시 배치를 옮길 때
// '경로 위'라는 전제가 조용히 깨져 테스트가 무의미해진다.
const { balls, sol } = global.window.__hb3test;
const path = sol().path;                              // [수구, 1쿠션, 2쿠션, ...]
const cue = { x: path[0].x, y: path[0].y };
// 출발 경로(수구 → 제1쿠션) 위에서 수구 바로 앞 지점.
// 회귀 지점이 t<=0.05 가드였으므로 '수구에 붙은' 구간을 노린다 — 멀리 두면
// 제2적구가 3쿠션 트랙에서 벗어나 시스템이 무효가 되고, blockedT 는 유효한
// 계산에서만 표시되므로 검사 자체가 성립하지 않는다.
const T = 0.08;
const onPath = { x: path[0].x + (path[1].x - path[0].x) * T,
                 y: path[0].y + (path[1].y - path[0].y) * T };
// 출발 방향의 정반대 = 수구 '뒤' — 여기 있는 공은 먼저 맞을 수 없다
const dir = { x: path[1].x - path[0].x, y: path[1].y - path[0].y };
const dlen = Math.hypot(dir.x, dir.y);
const behind = { x: cue.x - dir.x / dlen * 30, y: cue.y - dir.y / dlen * 30 };

// --- 2) 제2적구를 출발 경로 위에 두면 경고해야 한다 ---
// 회귀 지점: t<=0.05 가드가 이 구간을 통째로 건너뛰어 '득점 라인'이라고 했다.
// (mouseup은 window에 걸려 있어 스텁이 삼킨다 — block-test.js와 같이 down+move만 쓴다)
handlers['g3-table:mousedown'][0](ev(balls.target.x, balls.target.y));
handlers['g3-table:mousemove'][0](ev(onPath.x, onPath.y));
handlers['g3-calc:click'][0]();
const out2 = strip();
check('출발 경로 위의 제2적구를 차단으로 경고한다', /제2적구.*출발 경로/.test(out2));
check('  └ 차단 시 초록 득점 라인을 띄우지 않는다', !/득점 라인/.test(out2));

// --- 3) 수구 뒤쪽(반대편)의 제2적구는 차단이 아니다 ---
handlers['g3-table:mousedown'][0](ev(onPath.x, onPath.y));
handlers['g3-table:mousemove'][0](ev(behind.x, behind.y));
handlers['g3-calc:click'][0]();
check('수구 뒤에 있는 제2적구는 차단으로 보지 않는다', !/제2적구.*출발 경로/.test(strip()));

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n제2적구 출발-경로 차단 검사 통과');
