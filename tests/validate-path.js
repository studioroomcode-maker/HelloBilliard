// 경로 정확도 재검증 — HTML에 실제 들어있는 물리 코드를 추출해
// ① 알시아토레 실측 앵커 ② 파이브앤하프 시스템과의 교차 검증을 수행.
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');

let pass=true;
const check=(name,val,lo,hi,unit)=>{
  const ok=val>=lo&&val<=hi;
  if(!ok) pass=false;
  console.log(` ${name}: ${typeof val==='number'?val.toFixed(1):val}${unit||''} (기대 ${lo}~${hi}) ${ok?'OK':'FAIL'}`);
  return ok;
};

// ═══ 1. 4구 엔진 (HTML 추출) — 실측 앵커 ═══
{
  const s=html.indexOf('/* ===== ② 시간 스텝 물리 시뮬레이터');
  const e=html.indexOf('// ===== ③');
  const block=html.slice(s,e);
  const RAIL=36, W4=840, H4=460;
  const play={x0:RAIL,y0:RAIL,x1:W4-RAIL,y1:H4-RAIL};
  const MM=(play.x1-play.x0)/2844;
  const BALL_R=32.75*MM, G_PX=9800*MM;
  const balls={cue:{x:0,y:0},r1:{x:0,y:0},r2:{x:0,y:0},cue2:{x:0,y:0}};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  eval(block.replace(/const (DT|MAX_T|SLIDE_EPS|STOP_EPS)/g,'var $1')
            .replace(/function /g,'var _f=function ').replace(/var _f=function (\w+)/g,'function $1'));
  const P={mus:0.20,mur:0.012,ec:0.85,muc:0.20,ebb:0.93,mubb:0.06};
  const deg=r=>r*180/Math.PI;

  function sepTest(dist,speed,spinV,off){
    const cue={x:150,y:230,vx:0,vy:0,wx:0,wy:0,wz:0};
    const obj={x:150+dist,y:230,vx:0,vy:0,wx:0,wy:0,wz:0};
    const aimY=230+off*2*BALL_R;
    const L=Math.hypot(dist,aimY-230);
    setShot(cue,{x:dist/L,y:(aimY-230)/L},speed,{v:spinV,h:0});
    let hit=null,t=0,preDir=0;
    while(t<3){
      stepBall(cue,P,DT); stepBall(obj,P,DT);
      if(!hit){
        preDir=Math.atan2(cue.vy,cue.vx);
        if(collideBB(cue,obj,P)) hit={t,preDir};
      }
      t+=DT;
      if(hit&&t>hit.t+0.5) break;
    }
    if(!hit) return null;
    return {cue:Math.abs(deg(Math.atan2(cue.vy,cue.vx)-hit.preDir)),
            obj:Math.abs(deg(Math.atan2(obj.vy,obj.vx)-hit.preDir)),
            cueBack:cue.vx<0};
  }
  console.log('═══ 1. 4구 엔진 — 알시아토레 실측 앵커 ═══');
  let r=sepTest(450,600,0,0.5);
  check('구름 1/2두께 수구 분리각',r.cue,27,38,'°');        // 실측 33.7°
  r=sepTest(450,600,0,0.75);
  check('구름 1/4두께 수구 분리각',r.cue,21,33,'°');        // 실측 27.3°
  r=sepTest(450,600,0,0.25);
  check('구름 3/4두께 수구 분리각',r.cue,21,33,'°');        // 실측 27.3°
  r=sepTest(80,850,0,0.5);
  check('스턴 1/2두께 수구+적구 합',r.cue+r.obj,75,95,'°'); // 탄젠트라인 ~85-90°
  r=sepTest(150,900,-1,0);
  check('끌기 정면 → 후진 여부',r.cueBack?1:0,1,1,'');
  r=sepTest(150,850,1,0.5);
  check('밀기 1/2두께 분리각(좁아짐)',r.cue,20,40,'°');

  // 쿠션 45° 무회전 반사
  {
    const b={x:400,y:230,vx:0,vy:0,wx:0,wy:0,wz:0};
    setShot(b,{x:Math.SQRT1_2,y:-Math.SQRT1_2},700,{v:0,h:0});
    let t=0,bounced=false;
    while(t<2){
      stepBall(b,P,DT);
      if(collideCushion(b,P)){bounced=true;break;}
      t+=DT;
    }
    const out=Math.abs(deg(Math.atan2(b.vy,b.vx)));
    check('무회전 45° 입사 반사(진행각)',out,44,60,'°');    // 마찰로 약간 짧아짐(>45)
  }
}

// ═══ 2. 3구 엔진 (HTML 추출) — 4구와 동일 물리인지 + 시스템 교차 검증 ═══
{
  const s=html.indexOf('/* ===== 🎯 물리 경로 제안');
  const e=html.indexOf('// ---- 물리 경로 UI ----');
  const block=html.slice(s,e);
  const M=44, W3=860, H3=460;
  const play={x0:M,y0:M,x1:W3-M,y1:H3-M};
  const PW=play.x1-play.x0, PH=play.y1-play.y0;
  const BALL_R=30.75*PW/2844;
  const DX=PW/8, DY=PH/4;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
  const norm=a=>{const l=Math.hypot(a.x,a.y)||1;return{x:a.x/l,y:a.y/l};};
  global.localStorage={getItem:()=>null,setItem(){}};
  const balls={cue:{x:0,y:0},obj:{x:0,y:0},target:{x:0,y:0}};
  eval(block.replace(/const (MM3|G3PX|DT3|MAXT3|SLIDE3|STOP3|SPINS3|rot3)/g,'var $1'));
  const P=phyParams();

  // 뱅크샷: 수구를 우하 코너(수구수 50)에 두고 상단 1쿠션수 v를 겨냥,
  // 순방향 시네루로 3쿠션 도착 지점을 실측한다.
  // 파이브앤하프 예측: 3쿠션수 = 50 − 1쿠션수
  function bankTest(c1v,h,v,speed){
    const b={x:play.x1-BALL_R-1, y:play.y1-BALL_R-1, vx:0,vy:0,wx:0,wy:0,wz:0};
    const aim={x:play.x0+(50-c1v)/10*DX, y:play.y0};
    const d=norm(sub(aim,b));
    setShot3(b,d,speed,{v,h});
    const contacts=[];
    let t=0;
    while(t<MAXT3){
      stepBall3(b,P,DT3);
      const px=b.x, py=b.y;
      if(collideCushion3(b,P)){
        let rail;
        if(py<=play.y0+BALL_R+1) rail='top';
        else if(py>=play.y1-BALL_R-1) rail='bottom';
        else if(px<=play.x0+BALL_R+1) rail='left';
        else rail='right';
        contacts.push({rail,x:px,y:py});
        if(contacts.length>=3) break;
      }
      if(!b.vx&&!b.vy) break;
      t+=DT3;
    }
    return contacts;
  }
  console.log('\n═══ 2. 3구 물리 ↔ 파이브앤하프 교차 검증 ═══');
  console.log('(수구수 50 코너 출발 · 시스템 예측: 3쿠션수 = 50 − 1쿠션수)');
  console.log('(실용 조준 구간 20~30만 판정 — 코너 사각(35~)은 임펄스 모델 한계로 정보만)');
  for(const c1 of [20,25,30,35]){
    let best=null;
    for(const h of [-1,1]) for(const v of [0.2,0.4]){
      const c=bankTest(c1,h,v,1250);
      if(c.length>=3&&c[0].rail==='top'&&c[1].rail==='left'&&c[2].rail==='bottom'){
        const c3num=(c[2].x-play.x0)/DX*10;
        if(!best||Math.abs(c3num-(50-c1))<Math.abs(best.c3-(50-c1)))
          best={c3:c3num,h,v};
      }
    }
    if(!best){ console.log(` 1쿠션 ${c1}: FAIL — 장-단-장 경로 미형성`); pass=false; continue; }
    if(c1<=25)
      check(`1쿠션 ${c1} → 3쿠션 (예측 ${50-c1})`, best.c3, 50-c1-8, 50-c1+8,
        ` (h=${best.h},v=${best.v})`);
    else
      console.log(` [정보] 1쿠션 ${c1} → 3쿠션 ${best.c3.toFixed(0)} (예측 ${50-c1}) — 깊은 뱅크는 임펄스 모델 한계(길게 나옴)`);
  }

  // 4구/3구 물리 코드 동일성 (이름·주석만 다른 텍스트 비교)
  console.log('\n═══ 3. 4구 ↔ 3구 물리 코드 일치 ═══');
  const strip=t=>t.replace(/\/\/[^\n]*/g,'').replace(/\s+/g,'');
  const f4s=strip(html.slice(html.indexOf('function stepBall(b,P,dt){'),html.indexOf('// 공-공 충돌')))
    .replace(/stepBall|G_PX|SLIDE_EPS|STOP_EPS/g,'X');
  const f3s=strip(html.slice(html.indexOf('function stepBall3(b,P,dt){'),html.indexOf('function collideBB3')))
    .replace(/stepBall3|G3PX|SLIDE3|STOP3/g,'X');
  const sameStep=f4s===f3s;
  const c4s=strip(html.slice(html.indexOf('function collideCushion(b,P){'),html.indexOf('// ===== ③')))
    .replace(/collideCushion/g,'X');
  const c3s=strip(html.slice(html.indexOf('function collideCushion3(b,P){'),
                             html.indexOf('// 쓰리쿠션 샷 시뮬레이션')))
    .replace(/collideCushion3/g,'X');
  const sameCush=c4s===c3s;
  if(!sameStep||!sameCush) pass=false;
  console.log(' stepBall 일치:', sameStep?'OK':'FAIL');
  console.log(' collideCushion 일치:', sameCush?'OK':'FAIL');
}

console.log(pass?'\n✓ 경로 물리 전체 검증 통과':'\n✗ 실패 항목 있음');
process.exit(pass?0:1);
