// 실력 3단계 + 모임도 검증 — localStorage 스텁으로 단계별 solve 비교
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
global.document = {
  getElementById(id) { return els[id] || (els[id] = mkEl(id)); },
  querySelectorAll() { return []; },
};
global.window = { addEventListener() {} };
let store = {};
global.localStorage = {
  getItem: k => store[k] ?? null,
  setItem(k, v) { store[k] = String(v); },
};
eval(code);

const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function runLevel(level, done) {
  store['hb_skill'] = level;
  handlers['g4-calc:click'][0]();
  setTimeout(() => {
    const out = els['g4-routes'].innerHTML;
    const titles = [...out.matchAll(/<span class="rtitle">([^<]+)<\/span>[\s\S]{0,90}?<span class="badge">([^<]+)<\/span>/g)];
    const gathers = [...out.matchAll(/공 모임도 <b>(\d+)%<\/b>/g)].map(m => m[1]);
    const powers = [...out.matchAll(/<div class="mlabel">추천 파워<\/div>/g)].length;
    console.log(`\n=== 4구 [${level}] — 카드 ${titles.length}개 ===`);
    titles.forEach((t, i) => console.log(` · ${t[1]} | ${t[2]} | 모임도 ${gathers[i] || '?'}%`));
    console.log(`  추천 파워 라벨: ${powers}개`);
    done();
  }, 60);
}

runLevel('beg', () =>
  runLevel('mid', () =>
    runLevel('adv', () => {
      // 3구 물리 경로 — 초급 vs 상급
      store['hb_skill'] = 'beg';
      handlers['g3-reset:click'][0]();
      handlers['g3-phys:click'][0]();
      setTimeout(() => {
        const out = els['g3-phyRoutes'].innerHTML;
        const t1 = [...out.matchAll(/<span class="rtitle">([^<]+)<\/span>[\s\S]{0,90}?<span class="badge">([^<]+)<\/span>/g)];
        console.log(`\n=== 3구 [beg] — 카드 ${t1.length}개 ===`);
        t1.forEach(t => console.log(' ·', t[1], '|', t[2]));
        const mixed = t1.some(t => /밀어|끌어/.test(t[1]));
        console.log('  혼합 당점 배제 확인:', mixed ? 'FAIL' : 'OK');
        store['hb_skill'] = 'adv';
        handlers['g3-phys:click'][0]();
        setTimeout(() => {
          const out2 = els['g3-phyRoutes'].innerHTML;
          const t2 = [...out2.matchAll(/<span class="rtitle">([^<]+)<\/span>[\s\S]{0,90}?<span class="badge">([^<]+)<\/span>/g)];
          const g2 = [...out2.matchAll(/공 모임도 <b>(\d+)%<\/b>/g)].map(m => m[1]);
          console.log(`\n=== 3구 [adv] — 카드 ${t2.length}개 ===`);
          t2.forEach((t, i) => console.log(' ·', t[1], '|', t[2], '| 모임도', (g2[i] || '?') + '%'));
        }, 60);
      }, 60);
    })));
