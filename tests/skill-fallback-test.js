// 실력 폴백 — '경로 없음'으로 끝나는 화면은 없어야 한다.
// 회귀 대상: 초급은 회전(시네루)·얇은 두께 샷을 탐색에서 제외하므로, 그 기술이
// 필수인 배치(두 적구가 멀고 하나가 상대공 옆)에서 경로 0개 + '공 배치를 바꿔
// 보세요'만 나왔다. 이제 현재 실력으로 0개면 상위 실력 기준으로 재탐색해
// '초보가 치기 어려운 코스라 중급 기준 제안'임을 배너로 밝히고 경로를 보여준다.
const fs = require('fs');
const code = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8')
  .match(/<script>([\s\S]*)<\/script>/)[1];

const handlers = {}, els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [892, 492] };
const ctxProxy = () => new Proxy({}, {
  get: (t, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} })
    : k === 'measureText' ? (s) => ({ width: String(s).length * 6 }) : (...a) => {},
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
const tabBtns = ['five', 'plus', 'ball'].map(s => { const b = mkEl('tab-' + s); b.dataset.sys = s; return b; });
const tipBtns = [1, 2, 3].map(t => { const b = mkEl('tip-' + t); b.dataset.tip = String(t); return b; });
const store = { hb_skill: 'beg' };
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) {
    if (sel === '#g3-tabs button') return tabBtns;
    if (sel === '#g3-tipseg button') return tipBtns;
    return [];
  },
};
global.window = { addEventListener() {} };
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem(k, v) { store[k] = String(v); },
};
eval(code);

const { balls, routes } = global.window.__hb4test;
let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };
async function run() {
  els['g4-routes'].innerHTML = '';
  handlers['g4-calc:click'][0]();
  for (let k = 0; k < 8000 && !els['g4-routes'].innerHTML; k++) await new Promise(r => setImmediate(r));
  return routes() || [];
}
// 초급 기준 경로 0개가 확인된 배치 — 두 적구가 멀고(공 23개) 하나가 상대공 옆(공 6개).
// 시네루+얇은 컷이 필수라 초급 제한(좌우 회전 금지·두꺼운 두께만)으로는 성립하는 샷이 없다.
const setL = () => {
  balls.cue.x = 216; balls.cue.y = 336;
  balls.r1.x = 230; balls.r1.y = 198;
  balls.r2.x = 610; balls.r2.y = 233;
  balls.cue2.x = 716; balls.cue2.y = 234;
};

(async () => {
  // MC 분산으로 드물게 초급에서도 1개가 나올 수 있다 — 폴백이 발동한 실행을 찾는다
  let rs = [], html = '', fired = false;
  for (let a = 0; a < 6; a++) {
    setL();
    rs = await run();
    html = els['g4-routes'].innerHTML;
    if (rs.length && rs[0].skillFallback) { fired = true; break; }
    if (!rs.length) continue;   // 폴백까지 갔는데도 0개 — 재시도
    // 초급 자체로 경로가 나온 실행 — 폴백 검사 불가, 다시
  }
  check('초급이 못 푸는 배치에서도 경로가 나온다 (폴백)', fired && rs.length > 0);
  if (fired) {
    check('  └ 폴백 기준이 중급이다', rs[0].skillFallback === 'mid' && rs[0].skillBase === 'beg');
    check('  └ 배너가 "초보가 치기 어려운 코스"를 밝힌다', /초보가 치기 어려운 코스/.test(html));
    check('  └ 배너가 성공률 기준 실력을 밝힌다', /성공률도 중급 기준/.test(html));
  }
  // 저장된 실력은 그대로여야 한다 (오버라이드는 탐색에만 쓰고 복원)
  check('저장된 실력 설정은 바뀌지 않는다', store['hb_skill'] === 'beg');

  if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
  console.log('\n실력 폴백 검사 통과');
})();
