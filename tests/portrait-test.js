// 세로 사진 진단 — 블롭·분류 상세 덤프
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','HelloBilli.html'),'utf8');
const core=html.slice(html.indexOf('function rgb2hsv'),html.indexOf('// ---- 사진 인식 UI ----'));
const BALL_R=8.84, MM=768/2844;
const play={x0:36,y0:36,x1:36+768,y1:36+388};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
eval(core.replace(/const /g,'var ').replace(/let /g,'var '));

const buf=require('zlib').gunzipSync(fs.readFileSync(require('path').join(__dirname,'fixtures','portrait.raw.gz')));
const W=buf.readInt32LE(0), H=buf.readInt32LE(4), stride=buf.readInt32LE(8);
const data=new Uint8ClampedArray(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const s=12+y*stride+x*4, d=(y*W+x)*4;
  data[d]=buf[s+2]; data[d+1]=buf[s+1]; data[d+2]=buf[s]; data[d+3]=255;
}
const img={data,width:W,height:H};
console.log('이미지', W, 'x', H, '(세로)');

const ac=autoCorners(img);
console.log('자동 감지:', ac.map(c=>`(${c.x.toFixed(0)},${c.y.toFixed(0)})`).join(' '));
const quad=insetCorners(orderCorners(ac));
const oc=orderCorners(quad);
// 앱과 동일: 두 방향 후보를 카메라 잔차로 비교
const cand=[oc,[oc[3],oc[0],oc[1],oc[2]]];
const est=cand.map(c=>estimateCamera(c,W/2,H/2));
console.log('가로 가정 err:', est[0]?est[0].err.toExponential(2):'실패',
  '/ 세로 가정 err:', est[1]?est[1].err.toExponential(2):'실패');
let ci;
if(est[0]&&est[1]) ci=est[1].err<est[0].err?1:0;
else if(est[0]) ci=0; else if(est[1]) ci=1; else ci=0;
console.log('선택된 방향:', ci===1?'세로':'가로');
const cs=cand[ci];
let cs2=cs;
let camW=est[ci];
if(camW){
  camW={x:camW.x,y:camW.y,z:camW.z+37};
  const wpts=[{x:0,y:0},{x:2844,y:0},{x:2844,y:1422},{x:0,y:1422}];
  const q=wpts.map(wi=>liftHeight(wi,camW,37));
  const Hp=homography(q,cs);
  if(Hp) cs2=wpts.map(wi=>applyH(Hp,wi.x,wi.y));
}
console.log('카메라:', camW?`(${camW.x.toFixed(0)}, ${camW.y.toFixed(0)}, 높이 ${camW.z.toFixed(0)}mm)`:'실패');
const res=detectBalls(img,cs2,play);
console.log('블롭 전체:');
res.blobs.forEach(b=>{
  let cls='(미분류)';
  if((b.h<0.065||b.h>0.92)&&b.s>0.22) cls='빨강';
  else if(b.s<0.30&&b.v>0.60) cls='흰?';
  else if(b.h>0.02&&b.h<0.28) cls='밝음후보';
  console.log(`  play(${b.x.toFixed(0)},${b.y.toFixed(0)}) size ${b.size} h ${b.h.toFixed(3)} s ${b.s.toFixed(2)} v ${b.v.toFixed(2)} → ${cls}`);
});
console.log('인식:', Object.keys(res.found).join(', ')||'없음');
for(const k in res.found)
  console.log(` ${k}: play(${res.found[k].x.toFixed(0)}, ${res.found[k].y.toFixed(0)})`);

const okDir=ci===1;
const okBalls=['cue','cue2','r1','r2'].every(k=>res.found[k]);
console.log('판정: 세로 방향', okDir?'OK':'FAIL', '· 4공 인식', okBalls?'OK':'FAIL');
process.exit(okDir&&okBalls?0:1);
