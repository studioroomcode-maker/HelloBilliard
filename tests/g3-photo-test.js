// 3구 사진 인식 — 공유 비전 API(__hbVision)를 3구 좌표계로 호출해
// 실사진(세로)에서 수구 2개+빨강이 검출·매핑되는지 확인
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
    click() { (handlers[id + ':click'] || []).forEach(f => f()); },
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

const V = global.window.__hbVision;
if (!V) { console.log('FAIL: __hbVision 미노출'); process.exit(1); }

// 세로 실사진 픽스처 로드
const buf = require('zlib').gunzipSync(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'portrait.raw.gz')));
const W = buf.readInt32LE(0), H = buf.readInt32LE(4), stride = buf.readInt32LE(8);
const data = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const s = 12 + y * stride + x * 4, d = (y * W + x) * 4;
  data[d] = buf[s + 2]; data[d + 1] = buf[s + 1]; data[d + 2] = buf[s]; data[d + 3] = 255;
}
const img = { data, width: W, height: H };

// 3구 좌표계 (M=44, 860×460)
const play3 = { x0: 44, y0: 44, x1: 816, y1: 416 };

const oc = V.orderCorners(V.insetCorners(V.orderCorners(V.autoCorners(img))));
const cand = [oc, [oc[3], oc[0], oc[1], oc[2]]];
const est = cand.map(c => V.estimateCamera(c, W / 2, H / 2));
let ci;
if (est[0] && est[1]) ci = est[1].err < est[0].err ? 1 : 0;
else ci = est[0] ? 0 : 1;
const cs = cand[ci];
let cs2 = cs, cam = est[ci];
if (cam) {
  cam = { x: cam.x, y: cam.y, z: cam.z + 37 };
  const w = [{x:0,y:0},{x:2844,y:0},{x:2844,y:1422},{x:0,y:1422}];
  const q = w.map(wi => V.liftHeight(wi, cam, 37));
  const Hp = V.homography(q, cs);
  if (Hp) cs2 = w.map(wi => V.applyH(Hp, wi.x, wi.y));
}
const res = V.detectBalls(img, cs2, play3);
const keys = Object.keys(res.found);
console.log('방향:', ci === 1 ? '세로' : '가로', '· 검출:', keys.join(', '));
// 3구 매핑 시뮬: 흰 수구 + (노랑, 빨강) → obj/target 배정 가능해야 함
const white = res.found.cue, yellow = res.found.cue2, red = res.found.r1;
const others = [yellow, red].filter(Boolean);
const ok = ci === 1 && white && others.length === 2;
console.log('3구 매핑 가능(수구+적구 2):', ok ? 'OK' : 'FAIL');
process.exit(ok ? 0 : 1);
