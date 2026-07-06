// 쿠션 수 규칙 테스트 — 추천/1/2/3↑ 별로 경로의 쿠션 수가 조건에 맞는지
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','HelloBilli.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];

const handlers = {}, els = {};
const CANVAS_SIZE = { 'g4-table': [840, 460], 'g3-table': [860, 460] };
const ctxProxy = () => new Proxy({}, {
  get: (t, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => {},
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
// 쿠션 규칙 버튼 스텁
const cruleBtns = ['any','1','2','3'].map(v => {
  const b = mkEl('crule-' + v); b.dataset.crule = v; return b;
});
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll(sel) {
    if (sel.includes('data-crule')) return cruleBtns;
    return [];
  },
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {} };
eval(code);

const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const RULES = ['any', '1', '2', '3'];
let idx = 0;

function runRule() {
  if (idx >= RULES.length) return;
  const v = RULES[idx++];
  const btn = cruleBtns.find(b => b.dataset.crule === v);
  handlers['crule-' + v + ':click'][0].call(btn);
  handlers['g4-calc:click'][0]();
  setTimeout(() => {
    const out = els['g4-routes'].innerHTML;
    const cards = [...out.matchAll(/<div class="desc">([\s\S]*?)<\/div>/g)].map(m => strip(m[1]));
    const probs = [...out.matchAll(/성공률 (\d+)%/g)].map(m => m[1]);
    console.log(`\n=== 규칙 [${v}] — 카드 ${cards.length}개 ===`);
    cards.forEach((c, i) => {
      const pre = c.match(/쿠션 (\d+)회 → 적구 \d/);      // 뱅크 선행
      const mid = c.match(/도착/) && c.match(/→ 쿠션 (\d+)회 →/);
      console.log(` · 성공률 ${probs[i]}% | ${c.slice(0, 90)}`);
    });
    if (!cards.length) console.log(' (경로 없음)', strip(out).slice(0, 120));
    runRule();
  }, 100);
}
runRule();
