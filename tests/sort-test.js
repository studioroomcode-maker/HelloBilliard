// 정렬 필터 테스트 — 추천순/쿠션수순 동작과 나머지 필터 잠금 검증
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
const sortBtns = ['best','cush','prob','gather'].map(v => {
  const b = mkEl('sort-' + v); b.dataset.sort = v; return b;
});
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) {
    if (sel.includes('g4-sortseg')) return sortBtns;
    return [];
  },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => 'adv', setItem() {} };  // 상급 — 후보 다양
global.localStorage.getItem = k => k === 'hb_skill' ? 'adv' : null;
eval(code);

handlers['g4-calc:click'][0]();
setTimeout(() => {
  const report = mode => {
    const out = els['g4-routes'].innerHTML;
    const probs = [...out.matchAll(/성공률 (\d+)%/g)].map(m => +m[1]);
    const gathers = [...out.matchAll(/공 모임 (\d+)%/g)].map(m => +m[1]);
    const cush = [...out.matchAll(/desc">수구 → (?:<b>쿠션 (\d+)회<\/b> → )?[\s\S]*?→ (?:쿠션 (\d+)회 → )?적/g)]
      .map(m => (+(m[1] || 0)) + (+(m[2] || 0)));
    console.log(`[${mode}] 쿠션수 ${JSON.stringify(cush)} · 성공률 ${JSON.stringify(probs)} · 모임 ${JSON.stringify(gathers)}`);
  };
  report('추천순(기본)');
  const click = v => handlers['sort-' + v + ':click'][0].call(sortBtns.find(b => b.dataset.sort === v));
  click('cush');
  setTimeout(() => {
    report('쿠션수순(재계산)');
    const before=els['g4-routes'].innerHTML;
    click('prob');
    click('gather');
    console.log('잠금 필터 유지:', before===els['g4-routes'].innerHTML?'OK':'FAIL');
    click('best'); report('추천순(즉시)');
  }, 4000);
}, 3500);
