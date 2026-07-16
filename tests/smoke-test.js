// index.html 의 <script>를 DOM 스텁으로 헤드리스 실행 — 실제 solve() 동작 검증
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('script not found'); process.exit(1); }
const code = m[1];

const handlers = {};
const els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [892, 492] };

const ctxProxy = () => new Proxy({}, {
  get: (t, k) => {
    if (k === 'createRadialGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (s) => ({ width: String(s).length * 6 });
    if (k === 'canvas') return {};
    return (...a) => {};
  },
  set: () => true,
});

function mkEl(id) {
  const [w, h] = CANVAS_SIZE[id] || [0, 0];
  return {
    id, innerHTML: '', textContent: '', style: {}, dataset: {}, disabled: false,
    width: w, height: h,
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
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

try {
  eval(code);
  console.log('✓ 스크립트 로드/초기화 성공 (문법·초기 draw 정상)');
} catch (e) {
  console.error('✗ 로드 실패:', e);
  process.exit(1);
}

// 4구: 경로 계산 실행
const t0 = Date.now();
handlers['g4-calc:click'][0]();
setTimeout(() => {
  const ms = Date.now() - t0;
  const out = els['g4-routes'].innerHTML;
  const cards = (out.match(/rcard/g) || []).length;
  console.log(`\n=== 4구 solve() — ${ms}ms, 경로 카드 ${cards}개 ===`);
  // 카드 요약 추출
  const titles = [...out.matchAll(/<span class="rtitle">([^<]+)<\/span>[\s\S]{0,90}?<span class="badge">([^<]+)<\/span>/g)];
  titles.forEach(t => console.log(' ·', t[1], '|', t[2]));
  const descs = [...out.matchAll(/<div class="desc">([\s\S]*?)<\/div>/g)];
  descs.forEach(d => console.log('   ', d[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)));
  if (!cards) console.log(out.slice(0, 400));

  // 3구: 파이브앤하프 계산 (기본 배치 — 수구가 레일에서 떨어져 있음 → 반복 보정 경로)
  handlers['g3-calc:click'][0]();
  const r3 = els['g3-result'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('\n=== 3구 파이브앤하프 ===');
  console.log(r3.slice(0, 300));
}, 100);
