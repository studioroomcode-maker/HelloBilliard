// 3구 첫 진입은 '시스템 미선택(물리 우선)'이어야 한다.
// 시스템(파이브앤하프·플러스·볼)은 특정 샷 패턴을 위한 조준 계산법이라, 하나를
// 켜 두는 게 아니라 궁금할 때 탭을 눌러 보고 다시 누르면 끈다(토글).
// 검증: ① 기본은 미선택(계산 패널 숨김·안내 표시) ② 탭을 누르면 유효 계산
//        ③ 같은 탭을 다시 누르면 꺼짐 ④ 사용자 배치 유지 ⑤ 예시가 물리 경로도 냄
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
const t = global.window.__hb3test;
const disp = (id) => (els[id] && els[id].style) ? els[id].style.display : undefined;
const clickTab = (sys) => handlers['tab-' + sys + ':click'][0]
  .call(tabBtns.find(x => x.dataset.sys === sys));

// --- 1) 기본 진입 = 시스템 미선택(물리 우선) ---
check('첫 진입은 시스템 미선택이다', t.system() === null);
check('  └ 계산 패널이 숨겨져 있다', disp('g3-calcPanel') === 'none');
check('  └ 물리 우선 안내가 보인다', disp('g3-noneHint') === '');
check('  └ 코치 카드가 숨겨져 있다', els['g3-coach'].hidden === true);

// --- 2) 파이브앤하프 탭을 누르면 유효한 계산이 나온다 ---
clickTab('five');
const five = strip('g3-result');
check('파이브앤하프를 누르면 득점 라인을 낸다', /득점 라인/.test(five));
check('  └ 식이 반듯하다 (45 − 20 = 25)',
  /수구수 45 − 제3쿠션수 20 = 제1쿠션수 25/.test(five));
check('  └ 실험적 배지가 없다', !/실험적/.test(five));
check('  └ 계산 패널이 보이고 안내는 숨는다',
  disp('g3-calcPanel') === '' && disp('g3-noneHint') === 'none');
check('  └ 코치 카드가 나타난다', els['g3-coach'].hidden === false);

// --- 3) 같은 탭을 다시 누르면 꺼진다(토글) ---
clickTab('five');
check('같은 탭을 다시 누르면 시스템이 꺼진다', t.system() === null);
check('  └ 안내가 다시 보이고 계산 패널이 숨는다',
  disp('g3-noneHint') === '' && disp('g3-calcPanel') === 'none');

// --- 4) 다른 시스템도 눌러 확인할 수 있다 ---
clickTab('plus');
check('플러스도 눌러 확인된다', /단-장-장/.test(strip('g3-result')));
clickTab('ball');
check('볼 시스템도 눌러 확인된다', /두께/.test(strip('g3-result')));

// --- 5) 사용자가 배치하면 그 배치가 탭 전환 후에도 유지된다 ---
clickTab('five');   // 볼 → 파이브 (선택 전환)
const { play, balls } = t;
const SPOT = { x: play.x0 + 300, y: play.y0 + 300 };
handlers['g3-table:mousedown'][0](ev(SPOT.x, SPOT.y));   // 빈 곳 탭 = 배치
handlers['g3-calc:click'][0]();
const afterPlace = strip('g3-nums');
t.setSystem('plus'); t.setSystem('five');
check('사용자 배치는 탭 전환 후에도 유지된다', strip('g3-nums') === afterPlace);

// --- 6) 예시 배치는 [물리 경로 제안]에도 답을 줘야 한다 ---
// 회귀 대상: 예시 배치가 시스템 숫자만 맞고 물리적으로 어려우면 경로가 전부
// 걸러져 "경로를 찾지 못했습니다"가 나온다 — 예시는 물리로도 답이 나와야 한다.
(async () => {
  handlers['g3-reset:click'][0]();     // 기본 배치 + 시스템 미선택
  handlers['g3-example:click'][0]();   // 예시(파이브 폴백) 배치
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
