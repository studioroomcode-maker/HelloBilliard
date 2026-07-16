// 첫 진입 화면은 '성공하는 배치'여야 한다 — 예시 배치 버튼을 누르지 않은 상태 검증.
// 회귀 대상: 3구 탭 첫 화면이 정식 초구 배치로 시작하는데 파이브앤하프는 그 배치를
// 지원하지 않아 곧바로 '유효 범위 밖'이 떴다. 처음 쓰는 사람은 고장으로 읽는다.
// 규칙: 사용자가 직접 배치하기 전(userPlaced=false)에는 각 탭이 자기 예시 배치를 쓴다.
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

const strip = (id) => (els[id].innerHTML || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };
const switchTo = (sys) => {
  const b = tabBtns.find(x => x.dataset.sys === sys);
  handlers['tab-' + sys + ':click'][0].call(b);
};

// --- 1) 첫 화면(파이브앤하프)이 실패 메시지 없이 득점 라인을 낸다 ---
const first = strip('g3-result');
check('첫 진입이 득점 라인을 낸다', /득점 라인/.test(first));
check('  └ 첫 진입에 "유효 범위 밖"이 없다', !/유효 범위 밖/.test(first));
check('  └ 첫 진입에 "적용 어려움"이 없다', !/적용 어려움/.test(first));
check('  └ AI 추천이 파이브앤하프를 5점으로 본다',
  /파이브앤하프 ★★★★★/.test(strip('g3-coach')));

// --- 2) 탭을 옮기면 그 시스템의 예시 배치로 갈아끼운다 ---
switchTo('plus');
check('플러스 탭 첫 진입이 유효하다',
  /단-장-장/.test(strip('g3-result')) && !/유효 범위 밖/.test(strip('g3-result')));
switchTo('ball');
const ballOut = strip('g3-result');
check('볼 시스템 탭 첫 진입이 유효하다',
  /두께/.test(ballOut) && !/범위\(1~7\) 밖/.test(ballOut));

// --- 3) 사용자가 직접 배치한 뒤에는 탭을 옮겨도 그 배치를 유지한다 ---
// (예시로 덮어쓰면 사용자가 방금 만든 상황이 사라진다)
switchTo('five');
// 좌표계는 앱에서 읽는다 — 여백(M)이나 캔버스 크기가 바뀌면 같이 따라간다
const { play } = global.window.__hb3test;
const SPOT = { x: play.x0 + 300, y: play.y0 + 300 };
handlers['g3-table:mousedown'][0](ev(SPOT.x, SPOT.y));   // 빈 곳 탭 = 배치
// 탭 배치의 자동 계산은 debounce(160ms)라 즉시 반영되지 않는다 — 계산을 강제한다
handlers['g3-calc:click'][0]();
const afterPlace = strip('g3-nums');
switchTo('plus');
switchTo('five');
check('사용자 배치는 탭 전환 후에도 유지된다', strip('g3-nums') === afterPlace);

// --- 4) 초기화는 정식 초구로 되돌리고, 그 배치를 예시로 덮지 않는다 ---
handlers['g3-reset:click'][0]();
handlers['g3-calc:click'][0]();
const afterReset = strip('g3-nums');
switchTo('plus');
switchTo('five');
check('초기화 배치는 탭 전환 후에도 유지된다', strip('g3-nums') === afterReset);

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n첫 진입 배치 검사 통과');
