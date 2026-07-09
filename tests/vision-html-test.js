// HTML 안에 심어진 인식 코어를 추출해 3가지 조명 시나리오로 검증
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function rgb2hsv');
const end=html.indexOf('// ---- 사진 인식 UI ----');
if(start<0||end<0||end<=start){ console.error('추출 실패'); process.exit(1); }
const core=html.slice(start,end);

const test=`
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
const BALL_R=8.84;   // detectBalls의 EXP 계산에 필요 (4구 IIFE 상수)
${core}
const play={x0:36,y0:36,x1:804,y1:424};
const PW=480,PH=360;
const photoCorners=[{x:60,y:80},{x:430,y:60},{x:460,y:320},{x:40,y:300}];
const playCorners=[
  {x:play.x0,y:play.y0},{x:play.x1,y:play.y0},
  {x:play.x1,y:play.y1},{x:play.x0,y:play.y1}];
const Hfp=homography(photoCorners,playCorners);
const truth={
  cue:{x:228,y:268,c:[242,238,228]},
  r1:{x:228,y:196,c:[198,42,32]},
  r2:{x:612,y:230,c:[198,42,32]},
  cue2:{x:720,y:230,c:[232,190,52]},
};

// 시나리오별 합성 사진 생성
// cast: [r,g,b] 배율 (조명 색), dim: 전체 밝기 배율, highlight: 공 위 반사광
// ballDim: 공만 어둡게 (측면광으로 그늘진 공 — 실사진 실패 사례 재현)
function makeImg(cast,dim,highlight,ballDim){
  const data=new Uint8ClampedArray(PW*PH*4);
  let rng=12345;
  const rand=()=>{ rng=(rng*1103515245+12345)&0x7fffffff; return rng/0x7fffffff; };
  for(let y=0;y<PH;y++)for(let x=0;x<PW;x++){
    const o=(y*PW+x)*4;
    const t=applyH(Hfp,x,y);
    let r=42,g=36,b=30;
    if(t.x>=play.x0&&t.x<=play.x1&&t.y>=play.y0&&t.y<=play.y1){
      const shade=(1-0.15*(y/PH))*dim;
      r=34*shade+(rand()*10-5); g=122*shade+(rand()*10-5); b=82*shade+(rand()*10-5);
      for(const k in truth){
        const B=truth[k];
        const d=Math.hypot(t.x-B.x,t.y-B.y);
        if(d<8.8){
          const bs=shade*(ballDim||1);
          r=B.c[0]*bs; g=B.c[1]*bs; b=B.c[2]*bs;
          // 좌상단 반사광
          if(highlight&&Math.hypot(t.x-(B.x-3),t.y-(B.y-3))<2.4){
            r=250*bs; g=246*bs; b=238*bs;
          }
        }
      }
    }
    data[o]=r*cast[0]; data[o+1]=g*cast[1]; data[o+2]=b*cast[2]; data[o+3]=255;
  }
  return {data,width:PW,height:PH};
}

let allPass=true;
function runScenario(name,img,tol){
  console.log('=== '+name+' ===');
  const ac=autoCorners(img);
  const oc=orderCorners(ac);
  const res=detectBalls(img,oc,play);
  for(const k of ['cue','r1','r2','cue2']){
    const f=res.found[k];
    if(!f){ console.log(' '+k+': FAIL 미검출'); allPass=false; continue; }
    const e=Math.hypot(f.x-truth[k].x,f.y-truth[k].y);
    if(e>=tol) allPass=false;
    console.log(' '+k+': 오차 '+e.toFixed(1)+'px '+(e<tol?'OK':'FAIL'));
  }
}

runScenario('A. 표준 조명', makeImg([1,1,1],1,false), 25);
runScenario('B. 노란 조명 캐스트 + 반사광 (흰공이 노랗게 보임)',
  makeImg([1.2,1.0,0.72],0.95,true), 25);
runScenario('C. 어두운 조명 + 반사광', makeImg([1.05,1.0,0.9],0.55,true), 25);
runScenario('D. 밝은 천 + 그늘진 공 (실사진 흰/노랑 미검출 사례)',
  makeImg([1.05,1.0,0.85],1.45,true,0.62), 25);

// ===== E. 카메라 역산 + 높이 시차 보정 (3D 투영 합성) =====
console.log('=== E. 카메라 역산 + 벽/공 높이 보정 ===');
{
  // 실제 카메라: 위치 C(mm), 초점 f(px), 주점 (240,180)
  const Ct=[1400,3000,1600], f=800, pcx=240, pcy=180;
  const target=[1422,711,0];
  const norm3=v=>{const l=Math.hypot(v[0],v[1],v[2]);return v.map(x=>x/l);};
  const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const zc=norm3([target[0]-Ct[0],target[1]-Ct[1],target[2]-Ct[2]]);
  const xc=norm3(cross3([0,0,1],zc));
  const yc=cross3(zc,xc);
  const project=P=>{
    const d=[P[0]-Ct[0],P[1]-Ct[1],P[2]-Ct[2]];
    const Xc=[xc[0]*d[0]+xc[1]*d[1]+xc[2]*d[2],
              yc[0]*d[0]+yc[1]*d[1]+yc[2]*d[2],
              zc[0]*d[0]+zc[1]*d[1]+zc[2]*d[2]];
    return {x:pcx+f*Xc[0]/Xc[2], y:pcy+f*Xc[1]/Xc[2]};
  };
  // 사용자가 표시하는 모서리 = 쿠션 코 (바닥보다 37mm 위)
  const NOSE=37;
  const cs=[[0,0],[2844,0],[2844,1422],[0,1422]].map(w=>project([w[0],w[1],NOSE]));
  // 1) 카메라 역산 — 앱과 동일: 코 평면 기준 단일 추정 + 37mm 보정
  let cam=estimateCamera(cs,pcx,pcy);
  let cs2=cs;
  if(cam){
    cam={x:cam.x, y:cam.y, z:cam.z+NOSE};
    const w=[{x:0,y:0},{x:2844,y:0},{x:2844,y:1422},{x:0,y:1422}];
    const q=w.map(wi=>liftHeight(wi,cam,NOSE));
    const Hp=homography(q,cs);
    if(Hp) cs2=w.map(wi=>applyH(Hp,wi.x,wi.y));
  }
  if(!cam){ console.log(' FAIL: 카메라 역산 실패'); allPass=false; }
  else {
    const he=Math.abs(cam.z-Ct[2]);
    console.log(' 카메라 높이 복원: '+cam.z.toFixed(0)+'mm vs 실제 '+Ct[2]+
      'mm — 오차 '+he.toFixed(0)+'mm '+(he<160?'OK':'FAIL'));
    if(he>=160) allPass=false;
    // 2) 공 위치 복원: 공 중심(높이 32.75mm)을 투영 → 평면 역변환 → 시차 보정
    const Hinv=homography(cs2,
      [{x:0,y:0},{x:2844,y:0},{x:2844,y:1422},{x:0,y:1422}]);
    for(const gt of [[2000,700],[500,1100],[2700,200]]){
      const img=project([gt[0],gt[1],32.75]);
      const q=applyH(Hinv,img.x,img.y);              // 보정 전 (평면 가정)
      const errRaw=Math.hypot(q.x-gt[0],q.y-gt[1]);
      const b=dropHeight(q,cam,32.75);               // 높이 시차 보정 후
      const err=Math.hypot(b.x-gt[0],b.y-gt[1]);
      console.log(' 공 ('+gt[0]+','+gt[1]+'): 보정 전 '+errRaw.toFixed(0)+
        'mm → 보정 후 '+err.toFixed(1)+'mm '+(err<10?'OK':'FAIL'));
      if(err>=10) allPass=false;
    }
  }
}

console.log(allPass?'\\n✓ 5개 시나리오 전체 통과':'\\n✗ 실패 있음');
process.exit(allPass?0:1);
`;
fs.writeFileSync(require('path').join(__dirname,'.gen-vision-run.js'),test);
require(require('path').join(__dirname,'.gen-vision-run.js'));
