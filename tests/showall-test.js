// 당구대에는 기본적으로 '선택한 경로 하나'만 그려야 한다.
// 회귀 대상: 제안 경로 3개를 항상 겹쳐 그려(비선택 alpha 0.2) 폰에서는 선이
// 교차해 정작 쳐야 할 조준선을 읽기 어려웠다. 비교는 [겹쳐 보기]로 켠다.
// stroke() 호출 수 대신 '경로 폴리라인을 몇 번 그렸는지'를 moveTo 로 센다.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];

const handlers = {}, els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [892, 492] };
// 그려진 선의 시작점을 기록하는 ctx — 경로 개수를 세기 위해
let strokes = [];
const ctxProxy = () => new Proxy({ lineWidth: 0, globalAlpha: 1 }, {
  get: (t, k) => {
    if (k === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (s) => ({ width: String(s).length * 6 });
    if (k === 'moveTo') return (x, y) => strokes.push({ x, y, alpha: t.globalAlpha });
    if (k in t) return t[k];
    return (...a) => {};
  },
  set: (t, k, v) => { t[k] = v; return true; },
});
function mkEl(id) {
  const [w, h] = CANVAS_SIZE[id] || [0, 0];
  const el = {
    id, innerHTML: '', textContent: '', style: {}, dataset: {}, disabled: false,
    width: w, height: h, hidden: false, _cls: new Set(),
    classList: {
      toggle(c, on) { on ? el._cls.add(c) : el._cls.delete(c); },
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      contains(c) { return el._cls.has(c); },
    },
    setAttribute(k, v) { el['attr_' + k] = v; },
    addEventListener(ev, fn) { (handlers[id + ':' + ev] = handlers[id + ':' + ev] || []).push(fn); },
    querySelectorAll() { return []; }, querySelector() { return null; },
    getContext() { return ctxProxy(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: w || 100, height: h || 100 }; },
  };
  return el;
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

let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };

(async () => {
  // 물리 경로가 여러 개 나오는 배치를 고정한다 (경로가 1개면 검사할 게 없다)
  const { balls, play } = global.window.__hb3test;
  const DX = (play.x1 - play.x0) / 8, DY = (play.y1 - play.y0) / 4;
  balls.cue.x = play.x1 - DX * 1.0; balls.cue.y = play.y1 - DY * 0.55;
  balls.obj.x = play.x0 + (play.x1 - play.x0) * 0.25; balls.obj.y = play.y0 + (play.y1 - play.y0) * 0.5;
  balls.target.x = play.x1 - DX * 3.6; balls.target.y = play.y1 - DY * 0.4;

  // 성공률은 몬테카를로라 같은 배치에서도 살아남는 경로 수가 흔들린다.
  // [겹쳐 보기]는 경로가 2개 이상일 때만 의미가 있으므로 그때까지 다시 계산한다.
  let nRoutes = 0;
  for (let attempt = 0; attempt < 6 && nRoutes < 2; attempt++) {
    els['g3-phyRoutes'].innerHTML = '';
    handlers['g3-phys:click'][0]();
    for (let i = 0; i < 600 && !els['g3-phyRoutes'].innerHTML; i++)
      await new Promise(r => setImmediate(r));
    nRoutes = (els['g3-phyRoutes'].innerHTML.match(/class="rcard/g) || []).length;
  }
  if (nRoutes < 2) {
    console.log(`6회 계산했지만 경로가 ${nRoutes}개뿐 — 겹쳐 보기를 검사할 수 없다`);
    process.exit(1);
  }

  // 흐리게(alpha<0.5) 그려진 폴리라인 = 비선택 경로
  const dim = () => strokes.filter(s => s.alpha > 0 && s.alpha < 0.5).length;

  strokes = [];
  handlers['g3-showAll:click'][0]();          // 켜기 → draw() 재실행
  const onDim = dim();
  check('겹쳐 보기를 켜면 비선택 경로가 흐리게 그려진다', onDim > 0);
  check('  └ 버튼이 켜짐으로 표시된다',
    els['g3-showAll'].classList.contains('on') &&
    els['g3-showAll']['attr_aria-pressed'] === 'true');

  strokes = [];
  handlers['g3-showAll:click'][0]();          // 끄기 = 기본 상태
  const offDim = dim();
  check('기본(끔)에서는 비선택 경로를 그리지 않는다', offDim === 0);
  check('  └ 선택한 경로는 여전히 그린다', strokes.some(s => s.alpha >= 0.5));
  check('  └ 버튼이 꺼짐으로 표시된다',
    !els['g3-showAll'].classList.contains('on') &&
    els['g3-showAll']['attr_aria-pressed'] === 'false');
  console.log(`  경로 ${nRoutes}개 · 켬: 흐린 선 ${onDim}개 / 끔: ${offDim}개`);

  if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
  console.log('\n선택 경로만 표시 검사 통과');
})();
