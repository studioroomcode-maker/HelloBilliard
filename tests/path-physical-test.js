// 시스템이 그리는 경로는 물리적으로 성립해야 한다.
// 회귀 대상: 플러스가 수구 위치를 검사하지 않아, 수구가 1쿠션 지점(우측 단쿠션)보다
// 위에 있으면 '내려가며 맞고 올라가는' 경로를 그렸다 — 수직 쿠션은 x 성분만
// 뒤집으므로 위아래가 뒤집히는 반사는 회전을 아무리 줘도 존재하지 않는다.
// '유효' 판정 배치의 25.9% 가 이 그림이었다. 틀린 경로는 없느니만 못하다.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];

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

const { balls, play, sol } = global.window.__hb3test;
const PW = play.x1 - play.x0, PH = play.y1 - play.y0;
const DX = PW / 8, DY = PH / 4;
let fails = 0;
const check = (name, cond) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) fails++; };

// 꼭짓점에서 반사 부호가 맞는지 — 수직 쿠션은 y 방향을, 수평 쿠션은 x 방향을 유지해야 한다
function impossible(p) {
  for (let i = 1; i < p.length - 1; i++) {
    const inD = { x: p[i].x - p[i - 1].x, y: p[i].y - p[i - 1].y };
    const outD = { x: p[i + 1].x - p[i].x, y: p[i + 1].y - p[i].y };
    const vert = Math.abs(p[i].x - play.x1) < 0.5 || Math.abs(p[i].x - play.x0) < 0.5;
    const horz = Math.abs(p[i].y - play.y0) < 0.5 || Math.abs(p[i].y - play.y1) < 0.5;
    if (vert && inD.y * outD.y < -1e-6) return `꼭짓점${i} 수직쿠션에서 y 방향 반전`;
    if (horz && !vert && inD.x * outD.x < -1e-6) return `꼭짓점${i} 수평쿠션에서 x 방향 반전`;
  }
  return null;
}

for (const sys of ['five', 'plus']) {
  handlers['tab-' + sys + ':click'][0].call(tabBtns.find(b => b.dataset.sys === sys));
  let total = 0, bad = 0, firstBad = null;
  for (let cx = 0.4; cx <= 4.0; cx += 0.3) {
    for (let cy = 0.15; cy <= 3.6; cy += 0.25) {
      for (let tx = 1.0; tx <= 7.5; tx += 0.7) {
        balls.cue.x = play.x1 - DX * cx; balls.cue.y = play.y1 - DY * cy;
        balls.target.x = play.x1 - DX * tx; balls.target.y = play.y1 - DY * 0.3;
        balls.obj.x = play.x0 + PW * 0.25; balls.obj.y = play.y0 + PH * 0.5;
        handlers['g3-calc:click'][0]();
        const s = sol();
        if (!s || !s.valid || !s.path) continue;
        total++;
        const why = impossible(s.path);
        if (why) { bad++; if (!firstBad) firstBad = { cx, cy, tx, why, s }; }
      }
    }
  }
  check(`${sys}: 유효 배치 ${total}개가 모두 물리적으로 성립하는 경로를 그린다 (불가능 ${bad}개)`, bad === 0);
  if (firstBad) {
    console.log(`    예: cue(DX*${firstBad.cx.toFixed(1)}, DY*${firstBad.cy.toFixed(2)}) → ${firstBad.why}`);
    console.log(`        ${firstBad.s.path.map(q => `(${q.x.toFixed(0)},${q.y.toFixed(0)})`).join(' → ')}`);
  }
  check(`  └ ${sys}: 검사할 유효 배치가 실제로 있었다`, total > 200);
}

// 플러스가 거부하는 대표 배치에서 '왜 안 되는지'를 설명하는지
handlers['tab-plus:click'][0].call(tabBtns.find(b => b.dataset.sys === 'plus'));
balls.cue.x = play.x1 - DX * 0.4; balls.cue.y = play.y1 - DY * 1.8;
balls.target.x = play.x1 - DX * 2.0; balls.target.y = play.y1 - DY * 0.3;
handlers['g3-calc:click'][0]();
const out = els['g3-result'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
check('수구가 1쿠션보다 위면 경로를 그리지 않고 이유를 설명한다',
  /수구가 제1쿠션 지점.*보다 위/.test(out) && !sol().path);
check('  └ 물리 경로 제안으로 유도한다', /물리 경로/.test(out));

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n경로 물리 성립성 검사 통과');
