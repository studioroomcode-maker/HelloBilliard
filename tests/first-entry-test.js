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
// 첫 화면은 '검증된 구간'이어야 한다 — 실험적 배지가 붙은 채로 시작하면
// 1번(성공하는 첫 화면)의 의미가 없다
check('  └ 첫 진입에 실험적 배지가 붙지 않는다', !/실험적/.test(first));
// 식이 반듯해야 처음 보는 사람이 눈으로 따라갈 수 있다 (g3-nums 는 원값 44.8,
// 사용자가 읽는 식은 g3-result 의 반올림값이다)
check('  └ 첫 진입 식이 반듯하다 (45 − 20 = 25)',
  /수구수 45 − 제3쿠션수 20 = 제1쿠션수 25/.test(first));

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

// --- 5) 예시 배치는 [물리 경로 제안]에도 답을 줘야 한다 ---
// 회귀 대상: 시스템 숫자(1쿠션수 20~25·반듯한 값)만 보고 예시를 고르면 수구를
// 코너에 붙이게 되는데, 그건 물리적으로 어려운 배치라 경로가 전부 걸러졌다.
// 첫 화면에서 버튼을 눌렀더니 "경로를 찾지 못했습니다"가 나오면 1번은 반쪽이다.
(async () => {
  // 예시 배치로 되돌린 뒤 계산 (위 4번에서 정식 초구로 바꿔 놨다)
  handlers['g3-example:click'][0]();
  const { balls } = global.window.__hb3test;
  const cueAt = { x: balls.cue.x, y: balls.cue.y };
  let got = 0;
  const TRIES = 3;
  for (let i = 0; i < TRIES; i++) {
    // solve3 는 몬테카를로라 수확량이 흔들린다 — 여러 번 보고 판단한다
    balls.cue.x = cueAt.x; balls.cue.y = cueAt.y;
    els['g3-phyRoutes'].innerHTML = '';
    handlers['g3-phys:click'][0]();
    for (let k = 0; k < 900 && !els['g3-phyRoutes'].innerHTML; k++)
      await new Promise(r => setImmediate(r));
    if (/class="rcard/.test(els['g3-phyRoutes'].innerHTML)) got++;
  }
  check(`예시 배치가 물리 경로도 낸다 (${TRIES}회 중 ${got}회)`, got >= TRIES - 1);

  if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
  console.log('\n첫 진입 배치 검사 통과');
})();
