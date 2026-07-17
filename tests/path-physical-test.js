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

const setTip = (t) => handlers['tip-' + t + ':click'] &&
  handlers['tip-' + t + ':click'][0].call(tipBtns[t - 1]);
const onRail = (p) => Math.abs(p.x - play.x0) < 0.5 || Math.abs(p.x - play.x1) < 0.5 ||
  Math.abs(p.y - play.y0) < 0.5 || Math.abs(p.y - play.y1) < 0.5;
const inBounds = (p) => p.x >= play.x0 - 0.5 && p.x <= play.x1 + 0.5 &&
  p.y >= play.y0 - 0.5 && p.y <= play.y1 + 0.5;
// 경로 하나가 물리적으로 성립하는지 — 성립하지 않으면 이유(문자열), 성립하면 null.
// ① 모든 점이 당구대 안 ② 세그먼트 길이 0 금지(코너 겹침 등 퇴화)
// ③ 중간 쿠션점은 레일 위 ④ 반사 부호: 수직쿠션은 y·수평쿠션은 x 방향 유지.
// (마지막=도착 구간은 순수 반사가 아니라 실측 트랙 팬이라 부호는 중간점만 본다)
function impossible(p) {
  for (const q of p) if (!inBounds(q)) return `점(${q.x.toFixed(0)},${q.y.toFixed(0)}) 당구대 밖`;
  for (let i = 0; i < p.length - 1; i++)
    if (Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y) < 1) return `세그먼트${i} 길이0(퇴화)`;
  for (let i = 1; i < p.length - 1; i++) {
    if (!onRail(p[i])) return `꼭짓점${i} 레일 위가 아님`;
    const inD = { x: p[i].x - p[i - 1].x, y: p[i].y - p[i - 1].y };
    const outD = { x: p[i + 1].x - p[i].x, y: p[i + 1].y - p[i].y };
    const vert = Math.abs(p[i].x - play.x1) < 0.5 || Math.abs(p[i].x - play.x0) < 0.5;
    const horz = Math.abs(p[i].y - play.y0) < 0.5 || Math.abs(p[i].y - play.y1) < 0.5;
    if (vert && inD.y * outD.y < -1e-6) return `꼭짓점${i} 수직쿠션에서 y 방향 반전`;
    if (horz && !vert && inD.x * outD.x < -1e-6) return `꼭짓점${i} 수평쿠션에서 x 방향 반전`;
  }
  return null;
}

// 세 팁(당점 보정으로 1쿠션 위치가 달라진다)을 모두 훑는다
for (const sys of ['five', 'plus']) {
  handlers['tab-' + sys + ':click'][0].call(tabBtns.find(b => b.dataset.sys === sys));
  let total = 0, bad = 0, firstBad = null;
  for (const tip of [1, 2, 3]) {
    setTip(tip);
    for (let cx = 0.2; cx <= 7.6; cx += 0.3) {
      for (let cy = 0.1; cy <= 3.85; cy += 0.2) {
        for (let tx = 0.4; tx <= 7.6; tx += 0.6) {
          balls.cue.x = play.x1 - DX * cx; balls.cue.y = play.y1 - DY * cy;
          balls.target.x = play.x1 - DX * tx; balls.target.y = play.y1 - DY * 0.3;
          balls.obj.x = play.x0 + PW * 0.25; balls.obj.y = play.y0 + PH * 0.5;
          handlers['g3-calc:click'][0]();
          const s = sol();
          if (!s || !s.valid || !s.path) continue;
          total++;
          const why = impossible(s.path);
          if (why) { bad++; if (!firstBad) firstBad = { tip, cx, cy, tx, why, s }; }
        }
      }
    }
  }
  setTip(2);
  check(`${sys}: 유효 배치 ${total}개(팁1·2·3)가 모두 물리적으로 성립한다 (불가능 ${bad}개)`, bad === 0);
  if (firstBad) {
    console.log(`    예: [팁${firstBad.tip}] cue(DX*${firstBad.cx.toFixed(1)}, DY*${firstBad.cy.toFixed(2)}) → ${firstBad.why}`);
    console.log(`        ${firstBad.s.path.map(q => `(${q.x.toFixed(0)},${q.y.toFixed(0)})`).join(' → ')}`);
  }
  check(`  └ ${sys}: 검사할 유효 배치가 실제로 있었다`, total > 200);
}

// 플러스가 거부하는 대표 배치에서 '왜 안 되는지'를 설명하는지
handlers['tab-plus:click'][0].call(tabBtns.find(b => b.dataset.sys === 'plus'));
setTip(2);
balls.cue.x = play.x1 - DX * 0.4; balls.cue.y = play.y1 - DY * 1.8;
balls.target.x = play.x1 - DX * 2.0; balls.target.y = play.y1 - DY * 0.3;
handlers['g3-calc:click'][0]();
const out = els['g3-result'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
check('수구가 1쿠션보다 위면 경로를 그리지 않고 이유를 설명한다',
  /수구가 제1쿠션 지점.*보다 위/.test(out) && !sol().path);
check('  └ 물리 경로 제안으로 유도한다', /물리 경로/.test(out));

// 알려진 퇴화 케이스를 격자 정렬과 무관하게 못박는다:
// 플러스 1쿠션수가 정확히 40이면 1쿠션점이 우상단 코너에 얹혀 2·3쿠션이 겹친다.
// c1Adj = 도착수 − 출발수 = 40 이 되도록 target(도착)·cue(출발)를 맞춘다.
balls.cue.x = play.x1 - DX * 0.0;   // 출발수 0 (우하 코너)
balls.target.x = play.x1 - DX * 4.0; balls.target.y = play.y1 - DY * 0.3;  // 도착수 40
balls.cue.y = play.y1 - DY * 0.5;   // 아래쪽 (수구가 1쿠션보다 위는 아님)
handlers['g3-calc:click'][0]();
const sPlusCorner = sol();
check('플러스 1쿠션수 40(코너 얹힘)은 유효로 그리지 않는다',
  !(sPlusCorner && sPlusCorner.valid && sPlusCorner.path));

// 파이브: 수구가 상단 장쿠션에 바싹 붙으면 상단 쿠션에서 x가 뒤집히는 그림이 된다.
handlers['tab-five:click'][0].call(tabBtns.find(b => b.dataset.sys === 'five'));
setTip(2);
balls.cue.x = play.x1 - DX * 5.1; balls.cue.y = play.y1 - DY * 3.58;  // 상단에 붙음
balls.target.x = play.x1 - DX * 1.1; balls.target.y = play.y1 - DY * 1.1;
handlers['g3-calc:click'][0]();
const sFiveTop = sol();
check('파이브: 상단 레일에 붙은 수구의 불가능 경로를 유효로 그리지 않는다',
  !(sFiveTop && sFiveTop.valid && sFiveTop.path && impossible(sFiveTop.path)));

if (fails) { console.log(`\n${fails}건 실패`); process.exit(1); }
console.log('\n경로 물리 성립성 검사 통과');
