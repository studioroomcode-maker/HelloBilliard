// 3구 화면에서도 '내 수구 색'과 '테이블 보정'을 바꿀 수 있어야 한다.
// 회귀 대상: 두 값 모두 3구 계산에 쓰이는데(hb4_myball → 사진 인식의 수구 배정,
// hb4_calib → phyParams 의 쿠션/구름) 컨트롤은 4구 탭에만 있었다. 3구만 쓰는
// 사람은 사진이 내 수구를 반대로 잡아도 고칠 방법을 찾을 수 없었다.
// 저장소가 하나이므로 어느 탭에서 바꾸든 양쪽 표시가 함께 움직여야 한다.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];

let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };

// ── 마크업 검사: 3구 패널(panel-m3) 안에 컨트롤이 실제로 있는가 ──
const m3 = html.slice(html.indexOf('<div class="mode-panel" id="panel-m3">'),
                      html.indexOf('<footer'));
check('3구 패널에 내 수구 색 컨트롤이 있다', /data-myball="yellow"/.test(m3));
check('3구 패널에 쿠션 보정 컨트롤이 있다', /data-cal="cush"/.test(m3));
check('3구 패널에 구름 보정 컨트롤이 있다', /data-cal="roll"/.test(m3));
// 같은 id 를 두 번 쓰면 문서가 깨진다 — 값 칩은 data 속성으로 갱신해야 한다
check('중복 id(calCush/calRoll)가 없다',
  !/id="calCush"/.test(html) && !/id="calRoll"/.test(html));

// ── 동작 검사: 3구 쪽 버튼을 눌러도 4구와 같은 값이 바뀌는가 ──
const handlers = {}, els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [892, 492] };
const ctxProxy = () => new Proxy({}, {
  get: (t, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} })
    : k === 'measureText' ? (s) => ({ width: String(s).length * 6 }) : (...a) => {},
  set: () => true,
});
function mkEl(id, dataset = {}) {
  const [w, h] = CANVAS_SIZE[id] || [0, 0];
  const el = {
    id, innerHTML: '', textContent: '', style: {}, dataset, disabled: false,
    width: w, height: h, hidden: false, _cls: new Set(),
    classList: {
      toggle(c, on) { on ? el._cls.add(c) : el._cls.delete(c); },
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      contains(c) { return el._cls.has(c); },
    },
    addEventListener(ev, fn) { (handlers[id + ':' + ev] = handlers[id + ':' + ev] || []).push(fn); },
    querySelectorAll() { return []; }, querySelector() { return null; },
    getContext() { return ctxProxy(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: w || 100, height: h || 100 }; },
  };
  return el;
}
// 4구·3구 두 탭에 같은 컨트롤이 하나씩 있는 상태를 재현한다
const calBtns = [];
for (const panel of ['g4', 'g3'])
  for (const k of ['cush', 'roll'])
    for (const d of ['-1', '1'])
      calBtns.push(mkEl(`${panel}-cal-${k}${d}`, { cal: k, d }));
const calVals = [];
for (const panel of ['g4', 'g3'])
  for (const k of ['cush', 'roll'])
    calVals.push(mkEl(`${panel}-calval-${k}`, { calVal: k }));
const myBtns = [];
for (const panel of ['g4', 'g3'])
  for (const c of ['white', 'yellow'])
    myBtns.push(mkEl(`${panel}-my-${c}`, { myball: c }));
const tabBtns = ['five', 'plus', 'ball'].map(sys => mkEl('tab-' + sys, { sys }));
const tipBtns = [1, 2, 3].map(t => mkEl('tip-' + t, { tip: String(t) }));

const store = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) {
    if (sel === '[data-cal]') return calBtns;
    if (sel === '[data-cal-val]') return calVals;
    if (sel === '[data-myball]') return myBtns;
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

const chip = (panel, k) => calVals.find(e => e.id === `${panel}-calval-${k}`).textContent;
const click = (el, ev) => (handlers[el.id + ':' + ev] || []).forEach(fn => fn.call(el));

// 3구 탭의 「쿠션 + 길게」를 두 번 누른다
const g3CushUp = calBtns.find(b => b.id === 'g3-cal-cush1');
click(g3CushUp, 'click'); click(g3CushUp, 'click');
check('3구에서 바꾼 보정이 저장된다', JSON.parse(store['hb4_calib'] || '{}').cush === 2);
check('  └ 3구 값 칩에 반영된다', chip('g3', 'cush') === '+2');
check('  └ 4구 값 칩에도 같이 반영된다', chip('g4', 'cush') === '+2');

// 4구 쪽에서 되돌리면 3구에도 반영된다
const g4CushDown = calBtns.find(b => b.id === 'g4-cal-cush-1');
click(g4CushDown, 'click');
check('4구에서 바꾼 보정이 3구 칩에 반영된다', chip('g3', 'cush') === '+1');
check('  └ 저장값도 같이 움직인다', JSON.parse(store['hb4_calib']).cush === 1);

// 보정 범위는 ±5 로 묶여 있다 (한쪽에서 눌러도 같은 한계)
for (let i = 0; i < 12; i++) click(g3CushUp, 'click');
check('보정값이 +5 를 넘지 않는다', JSON.parse(store['hb4_calib']).cush === 5);

// 3구에서 내 수구 색을 바꾸면 저장되고 양쪽 버튼 상태가 같이 바뀐다
const g3Yellow = myBtns.find(b => b.id === 'g3-my-yellow');
click(g3Yellow, 'click');
check('3구에서 바꾼 내 수구 색이 저장된다', store['hb4_myball'] === 'yellow');
check('  └ 4구 버튼도 노란공으로 표시된다',
  myBtns.find(b => b.id === 'g4-my-yellow').classList.contains('on') &&
  !myBtns.find(b => b.id === 'g4-my-white').classList.contains('on'));
check('  └ 3구 버튼도 노란공으로 표시된다',
  myBtns.find(b => b.id === 'g3-my-yellow').classList.contains('on'));

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n3구 설정 노출 검사 통과');
