// 물리 경로 카드의 '추천 파워'는 실측값이어야 한다.
// 회귀 대상: 카드에 '추천 파워 강(4레일)'이 하드코딩돼 있어, 바로 옆에서
// '쿠션 3회'라고 표시하면서 4레일 파워를 권하는 모순된 화면이 나갔다.
// 이제는 속도 3종(약/중/강)을 각각 실측해 성공률이 가장 높은 속도를 고른다.
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

let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };

(async () => {
  // 배치를 명시한다 — 예시 배치에 얹으면 프리셋을 옮길 때마다 경로 수확량이
  // 달라져 테스트가 들쭉날쭉해진다. 여기서 보는 건 카드의 '파워 표기'이므로
  // 물리 경로가 넉넉히 나오는 배치를 고정해 쓴다.
  const { balls, play } = global.window.__hb3test;
  const DX = (play.x1 - play.x0) / 8, DY = (play.y1 - play.y0) / 4;
  balls.cue.x = play.x1 - DX * 1.0; balls.cue.y = play.y1 - DY * 0.55;
  balls.obj.x = play.x0 + (play.x1 - play.x0) * 0.25; balls.obj.y = play.y0 + (play.y1 - play.y0) * 0.5;
  balls.target.x = play.x1 - DX * 3.6; balls.target.y = play.y1 - DY * 0.4;

  // 성공률이 몬테카를로라 재현율이 낮은 경로는 전부 걸러질 수 있다(=카드 0개).
  // 여기서 볼 건 '카드의 파워 표기'이므로 카드가 하나라도 나올 때까지 다시 계산한다.
  let cards = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    els['g3-phyRoutes'].innerHTML = '';
    handlers['g3-phys:click'][0]();
    // solve3 는 비동기 — 완료될 때까지 이벤트 루프를 돌린다
    for (let i = 0; i < 600 && !els['g3-phyRoutes'].innerHTML; i++)
      await new Promise(r => setImmediate(r));
    cards = els['g3-phyRoutes'].innerHTML;
    if (/class="rcard/.test(cards)) break;
  }
  const text = cards.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('  카드 요약:', text.slice(0, 260));

  check('경로 카드가 렌더링된다', /추천 파워/.test(text));
  check('  └ 하드코딩된 "강(4레일)"이 없다', !/강\(4레일\)/.test(cards));
  check('  └ undefined 가 새어나오지 않는다', !/undefined/.test(cards));

  // 파워 라벨은 실제로 고른 속도 3종 중 하나여야 한다 — 카드마다 정확히 하나
  const nCards = (cards.match(/class="rcard/g) || []).length;
  const powers = [...cards.matchAll(/추천 파워 <b>(약|중|강)<\/b>/g)].map(m => m[1]);
  check(`카드 ${nCards}개가 각각 약/중/강 중 하나를 권장한다`,
    nCards > 0 && powers.length === nCards);

  // 카드에 적힌 쿠션수와 이동거리는 서로 모순되지 않아야 한다
  const rails = [...text.matchAll(/수구 ([\d.]+)레일 구름/g)].map(m => parseFloat(m[1]));
  check('이동거리가 실측 범위(0.5~8레일) 안이다',
    rails.length > 0 && rails.every(v => v > 0.5 && v < 8));

  // 표시 성공률 0% 경로는 제안하지 않는다
  const pcts = [...text.matchAll(/(\d+) % 성공률/g)].map(m => parseInt(m[1], 10));
  check('성공률 0% 카드가 없다', pcts.every(v => v >= 5));
  console.log('  성공률:', pcts.join('% / ') + '% · 파워:', powers.join(' / '),
    '· 이동:', rails.map(v => v + '레일').join(' / '));

  if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
  console.log('\n추천 파워 실측 검사 통과');
})();
