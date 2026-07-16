// 시나리오 테스트: 상대 수구가 수구→적구1 직선 길목을 막는 배치
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
    querySelectorAll() { return []; },
    getContext() { return ctxProxy(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: w || 100, height: h || 100 }; },
  };
}
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll() { return []; },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {} };
eval(code);

const ev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {} });
const down = e => handlers['g4-table:mousedown'][0](e);
const move = e => handlers['g4-table:mousemove'][0](e);

// 수구를 (100,230)으로 (빈 곳 탭 = 활성공 이동, 기본 활성공 = 수구)
down(ev(100, 230));
// 적구1을 (228,196)에서 드래그해 (500,230)으로
down(ev(228, 196)); move(ev(500, 230));
// 상대 수구를 (720,230)에서 드래그해 (300,230)으로 — 수구→적구1 직선상
down(ev(720, 230)); move(ev(300, 230));

const t0 = Date.now();
handlers['g4-calc:click'][0]();
setTimeout(() => {
  const ms = Date.now() - t0;
  const out = els['g4-routes'].innerHTML;
  const cards = (out.match(/rcard/g) || []).length;
  console.log(`=== 차단 배치 solve() — ${ms}ms, 카드 ${cards}개 ===`);
  const titles = [...out.matchAll(/<span class="rtitle">([^<]+)<\/span>[\s\S]{0,90}?<span class="badge">([^<]+)<\/span>/g)];
  titles.forEach(t => console.log(' ·', t[1], '|', t[2]));
  const descs = [...out.matchAll(/<div class="desc">([\s\S]*?)<\/div>/g)];
  descs.forEach(d => console.log('   ', d[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)));
  if (!cards) console.log('(경로 없음 메시지):', out.replace(/<[^>]+>/g, '').trim());
}, 100);
