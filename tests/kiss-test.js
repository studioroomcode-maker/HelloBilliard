// 물리 경로의 '키스' 정직성 검사.
// 물리 경로는 실제 시뮬레이션이라 궤적 자체는 물리적이지만(경계 이탈·터널링 0%),
// 제1적구가 제2적구를 먼저 밀어낸 뒤 수구가 밀려난 자리에서 득점하는 '키스' 경로가
// 있다. 이때 제2적구는 시작 위치에 그려지므로 선이 그 공을 빗나가 보인다 —
// 그림이 오해를 준다. 그런 경로에는 r.kiss 플래그가 붙어 카드가 이유를 설명해야 한다.
// 회귀 대상: 키스 경로를 아무 표시 없이 '제2적구 득점'으로만 보여주던 것.
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

const { balls, play, routes, BALL_R } = global.window.__hb3test;
const DX = (play.x1 - play.x0) / 8, DY = (play.y1 - play.y0) / 4;
let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };

async function run() {
  els['g3-phyRoutes'].innerHTML = '';
  handlers['g3-phys:click'][0]();
  for (let k = 0; k < 3000 && !els['g3-phyRoutes'].innerHTML; k++) await new Promise(r => setImmediate(r));
  return routes() || [];
}
const missesTarget = (r) => {
  const m = Math.min(...r.path.map(q => Math.hypot(q.x - balls.target.x, q.y - balls.target.y)));
  return m > 2.5 * BALL_R;   // 선이 그려진 제2적구를 눈에 띄게 빗나감
};

(async () => {
  // ── 1) 키스가 잘 나오는 배치: 빗나가는 경로엔 반드시 kiss 플래그 ──
  // (제2적구가 먼 코너 — 제1적구가 먼저 건드리기 쉬운 형태)
  let kissRoutes = 0, missRoutes = 0, flaggedMiss = 0, cleanFlagged = 0, cleanRoutes = 0;
  for (let a = 0; a < 14; a++) {
    balls.cue.x = play.x1 - DX * 0.3; balls.cue.y = play.y1 - DY * 1.65;
    balls.obj.x = play.x0 + DX * 2.0; balls.obj.y = play.y0 + DY * 3.4;
    balls.target.x = play.x1 - DX * 6.0; balls.target.y = play.y1 - DY * 0.3;
    for (const r of await run()) {
      const miss = missesTarget(r);
      if (r.kiss) kissRoutes++;
      if (miss) { missRoutes++; if (r.kiss) flaggedMiss++; }
      else { cleanRoutes++; if (r.kiss) cleanFlagged++; }
    }
  }
  console.log(`  키스 배치: 빗나가는 경로 ${missRoutes}개 중 kiss 플래그 ${flaggedMiss}개 · ` +
    `안 빗나가는 ${cleanRoutes}개 중 오탐 ${cleanFlagged}개`);
  // 빗나가는 경로는 전부 플래그돼야 한다 (그림이 오해를 주므로)
  check('선이 제2적구를 빗나가는 경로는 모두 키스로 표시된다', missRoutes === 0 || flaggedMiss === missRoutes);
  // 시작 위치를 지나는(정상) 경로엔 키스 오탐이 거의 없어야 한다
  check('제자리 적구를 지나는 경로엔 키스 오탐이 없다', cleanFlagged === 0);

  // ── 2) 카드에 키스 경로가 있으면 이유를 설명한다 ──
  let sawKissCard = false;
  for (let a = 0; a < 8 && !sawKissCard; a++) {
    balls.cue.x = play.x1 - DX * 0.3; balls.cue.y = play.y1 - DY * 1.65;
    balls.obj.x = play.x0 + DX * 2.0; balls.obj.y = play.y0 + DY * 3.4;
    balls.target.x = play.x1 - DX * 6.0; balls.target.y = play.y1 - DY * 0.3;
    const rs = await run();
    if (rs.some(r => r.kiss)) {
      sawKissCard = true;
      const html = els['g3-phyRoutes'].innerHTML;
      check('키스 경로 카드가 "키스"라고 설명한다', /키스/.test(html));
      check('  └ 선이 제2적구를 빗나가는 이유를 밝힌다', /빗나가/.test(html));
    }
  }
  if (!sawKissCard) console.log('  (키스 카드를 못 만나 카드 문구 검사는 생략 — 다음 실행에서 확인)');

  // ── 3) 4구도 같은 원칙 — 두 번째 적구가 밀려나 선이 빗나가면 키스로 표시 ──
  // 4구 키스는 적구끼리 충돌·재타격만 잡고 접촉 직전 밀림은 놓쳤다(회귀 대상).
  // 이 배치(밀어치기 계열)는 제1적구를 맞히기 전 그 공이 밀려나는 경로를 낸다.
  const g4 = global.window.__hb4test;
  const g4run = async () => {
    els['g4-routes'].innerHTML = '';
    handlers['g4-calc:click'][0]();
    for (let k = 0; k < 5000 && !els['g4-routes'].innerHTML; k++) await new Promise(r => setImmediate(r));
    return g4.routes() || [];
  };
  const g4seg = (path, b) => {
    let m = Infinity;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], c = path[i], dx = c.x - a.x, dy = c.y - a.y, L2 = dx * dx + dy * dy;
      let t = L2 < 1e-9 ? 0 : ((b.x - a.x) * dx + (b.y - a.y) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      m = Math.min(m, Math.hypot(b.x - (a.x + dx * t), b.y - (a.y + dy * t)));
    }
    return m / g4.BALL_R;
  };
  const G4DX = (g4.play.x1 - g4.play.x0) / 8, G4DY = (g4.play.y1 - g4.play.y0) / 4;
  let g4miss = 0, g4flagged = 0, g4checked = 0;
  for (let a = 0; a < 10; a++) {
    g4.balls.cue.x = g4.play.x0 + G4DX * 4.4; g4.balls.cue.y = g4.play.y0 + G4DY * 3.35;
    g4.balls.r1.x = g4.play.x0 + G4DX * 3.5; g4.balls.r1.y = g4.play.y0 + G4DY * 0.6;
    g4.balls.r2.x = g4.play.x0 + G4DX * 5.0; g4.balls.r2.y = g4.play.y0 + G4DY * 3.4;
    g4.balls.cue2.x = g4.play.x0 + G4DX * 7.5; g4.balls.cue2.y = g4.play.y0 + G4DY * 3.7;
    for (const r of await g4run()) {
      if (!r.cuePath || r.cuePath.length < 2) continue;
      g4checked++;
      const d1 = g4seg(r.cuePath, g4.balls.r1), d2 = g4seg(r.cuePath, g4.balls.r2);
      if (d1 > 2.5 || d2 > 2.5) { g4miss++; if (r.kiss) g4flagged++; }
    }
  }
  console.log(`  4구: 경로 ${g4checked}개 중 선이 적구 빗나감 ${g4miss}개 · 키스표시 ${g4flagged}개`);
  check('4구도 선이 적구를 빗나가는 경로는 모두 키스로 표시된다', g4miss === 0 || g4flagged === g4miss);
  check('  └ 4구 검사할 경로가 실제로 있었다', g4checked > 5);

  if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
  console.log('\n키스 정직성 검사 통과');
})();
