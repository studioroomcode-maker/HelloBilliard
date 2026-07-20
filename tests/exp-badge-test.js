// 저신뢰 구간(깊은 뱅크) '실험적' 배지 검증.
// tests/validate-path.js 의 교차 검증은 제1쿠션수 20~25 만 합격 판정하고
// 30~35 는 정보로만 출력한다(물리와 차트가 10 이상 어긋남). 그런데 앱 UI 는
// 그보다 넓은 구간을 그냥 '득점 라인'으로 보여줬다 — 신뢰 범위를 알려야 한다.
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
    width: w, height: h, hidden: false,
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(ev, fn) { (handlers[id + ':' + ev] = handlers[id + ':' + ev] || []).push(fn); },
    querySelectorAll() { return []; }, querySelector() { return null; },
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

const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };
const nums = () => (els['g3-nums'].innerHTML || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const result = () => els['g3-result'].innerHTML || '';
const c1 = () => {
  const m = nums().match(/제1쿠션수 ([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
};

// 기본은 시스템 미선택이므로 파이브앤하프를 켜고 검사한다.
global.window.__hb3test.setSystem('five');
// 수구를 하단 레일을 따라 옮기며 제1쿠션수를 훑는다 — 수구수가 커질수록 1쿠션수도 커진다
// (좌표계는 앱에서 읽는다 — 여백·캔버스 크기가 바뀌어도 같은 지점을 가리키도록)
const { play } = global.window.__hb3test;
const DX = (play.x1 - play.x0) / 8, DY = (play.y1 - play.y0) / 4;
// 공은 '잡아서 드래그'로만 옮겨진다 (빈 곳 탭 배치는 스크롤 중 오조작 방지로 제거됨).
// 그래서 수구를 잡아(mousedown) 목표 지점으로 끄는(mousemove) 실제 입력 경로를 쓴다.
const B3 = global.window.__hb3test.balls;
const seen = [];
for (let k = 0; k <= 24; k++) {
  handlers['g3-table:mousedown'][0](ev(B3.cue.x, B3.cue.y));
  handlers['g3-table:mousemove'][0](ev(play.x1 - DX * (0.4 + k * 0.12), play.y1 - DY * 0.5));
  handlers['g3-calc:click'][0]();
  const v = c1();
  if (v == null || !/득점 라인/.test(result())) continue;
  seen.push({ c1: v, badge: /실험적/.test(result()) });
}

check('여러 제1쿠션수 구간을 실제로 훑었다', seen.length >= 5);
const deep = seen.filter(s => s.c1 >= 30), shallow = seen.filter(s => s.c1 < 30);
console.log(`  검사한 유효 배치 ${seen.length}개 · 1쿠션수 ${Math.min(...seen.map(s=>s.c1)).toFixed(0)}~${Math.max(...seen.map(s=>s.c1)).toFixed(0)}`);
console.log(`  깊은 뱅크(≥30) ${deep.length}개 / 검증 구간(<30) ${shallow.length}개`);

check('깊은 뱅크(1쿠션수 ≥30)에는 실험적 배지가 붙는다',
  deep.length > 0 && deep.every(s => s.badge));
check('검증 구간(1쿠션수 <30)에는 배지가 붙지 않는다',
  shallow.length > 0 && shallow.every(s => !s.badge));

// 배지는 계산을 막지 않는다 — 여전히 득점 라인과 겨냥 지시를 준다
const deepShown = seen.find(s => s.c1 >= 30);
check('배지가 있어도 계산 결과는 그대로 제공된다', !!deepShown);

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n실험적 배지 검사 통과');
