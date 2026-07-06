// 실제 당구장 사진(real.raw)으로 전체 인식 파이프라인 검증.
// 결과를 real-annotated.png 로 그려서 눈으로 확인한다.
const fs=require('fs');
const zlib=require('zlib');

// ── HTML에서 인식 코어 추출 ──
const html=fs.readFileSync(require('path').join(__dirname,'..','HelloBilli.html'),'utf8');
const start=html.indexOf('function rgb2hsv');
const end=html.indexOf('// ---- 사진 인식 UI ----');
const core=html.slice(start,end);
const BALL_R=8.84, MM=768/2844;
const play={x0:36,y0:36,x1:36+768,y1:36+388};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
eval(core.replace(/const /g,'var ').replace(/let /g,'var '));

// ── raw 이미지 로드 (BGRA → RGBA) ──
const buf=require('zlib').gunzipSync(fs.readFileSync(require('path').join(__dirname,'fixtures','real.raw.gz')));
const W=buf.readInt32LE(0), H=buf.readInt32LE(4), stride=buf.readInt32LE(8);
const data=new Uint8ClampedArray(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const s=12+y*stride+x*4, d=(y*W+x)*4;
  data[d]=buf[s+2]; data[d+1]=buf[s+1]; data[d+2]=buf[s]; data[d+3]=255;
}
const img={data,width:W,height:H};
console.log('이미지', W, 'x', H);

// ── 1. 모서리 자동 감지 v2 ──
const ac=autoCorners(img);
console.log('천 바깥 경계 자동 감지:', ac.map(c=>`(${c.x},${c.y})`).join(' '));
const quad=insetCorners(orderCorners(ac));
console.log('쿠션 안쪽 보정 후:', quad.map(c=>`(${c.x.toFixed(0)},${c.y.toFixed(0)})`).join(' '));

// ── 2. 앱과 동일한 감지 플로우 ──
const oc=orderCorners(quad);
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const qw=(d2(oc[0],oc[1])+d2(oc[3],oc[2]))/2;
const qh=(d2(oc[0],oc[3])+d2(oc[1],oc[2]))/2;
const cs=qh>qw*1.15?[oc[3],oc[0],oc[1],oc[2]]:oc;
// 벽 높이 보정 (앱과 동일: 단일 추정 + 코 평면→바닥 +37mm)
let cs2=cs;
let camW=estimateCamera(cs,W/2,H/2);
if(camW){
  const NOSE=37;
  camW={x:camW.x, y:camW.y, z:camW.z+NOSE};
  const wpts=[{x:0,y:0},{x:2844,y:0},{x:2844,y:1422},{x:0,y:1422}];
  const q=wpts.map(wi=>liftHeight(wi,camW,NOSE));
  const Hp=homography(q,cs);
  if(Hp) cs2=wpts.map(wi=>applyH(Hp,wi.x,wi.y));
}
console.log('카메라:', camW?`(${camW.x.toFixed(0)}, ${camW.y.toFixed(0)}, 높이 ${camW.z.toFixed(0)}mm)`:'역산 실패(수직 촬영?)');
const res=detectBalls(img,cs2,play);
const rawFound={};
for(const k in res.found) rawFound[k]={x:res.found[k].x,y:res.found[k].y};
if(camW) for(const k in res.found){
  const q={x:(res.found[k].x-play.x0)/MM, y:(res.found[k].y-play.y0)/MM};
  const b=dropHeight(q,camW,32.75);
  res.found[k]={x:play.x0+b.x*MM, y:play.y0+b.y*MM};
}
console.log('블롭 수:', res.blobs.length, '/ ambiguous:', res.ambiguous);
res.blobs.forEach(b=>console.log('  blob play(',b.x.toFixed(0),b.y.toFixed(0),') size',b.size,
  'h',b.h.toFixed(3),'s',b.s.toFixed(2),'v',b.v.toFixed(2)));
console.log('인식된 공:', Object.keys(res.found).join(', '));

// ── 3. 사진 좌표로 투영해 주석 PNG 생성 ──
const tbl=[{x:play.x0,y:play.y0},{x:play.x1,y:play.y0},
           {x:play.x1,y:play.y1},{x:play.x0,y:play.y1}];
const Hb=homography(tbl,cs2);
const marks={};
for(const k in res.found){
  // 마크는 보정 전(사진에서 보이는 공) 위치, 보정 후 좌표도 함께 출력
  marks[k]=applyH(Hb,rawFound[k].x,rawFound[k].y);
  const corr=applyH(Hb,res.found[k].x,res.found[k].y);
  console.log(` ${k}: 보정후 play(${res.found[k].x.toFixed(1)}, ${res.found[k].y.toFixed(1)})`+
    ` · 사진 마크(${marks[k].x.toFixed(0)}, ${marks[k].y.toFixed(0)})`+
    ` · 보정이동 ${(Math.hypot(corr.x-marks[k].x,corr.y-marks[k].y)).toFixed(0)}px`);
}

// 그리기 유틸
function setPx(x,y,r,g,b){
  x=Math.round(x); y=Math.round(y);
  if(x<0||y<0||x>=W||y>=H) return;
  const o=(y*W+x)*4;
  data[o]=r; data[o+1]=g; data[o+2]=b;
}
function circle(cx,cy,rad,col){
  for(let a=0;a<360;a+=1){
    const x=cx+rad*Math.cos(a*Math.PI/180), y=cy+rad*Math.sin(a*Math.PI/180);
    setPx(x,y,...col); setPx(x+0.5,y,...col); setPx(x,y+0.5,...col);
  }
}
function cross(cx,cy,len,col){
  for(let i=-len;i<=len;i++){ setPx(cx+i,cy,...col); setPx(cx,cy+i,...col); }
}
function lineP(a,b,col){
  const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));
  for(let i=0;i<=n;i++){
    setPx(a.x+(b.x-a.x)*i/n, a.y+(b.y-a.y)*i/n, ...col);
    setPx(a.x+(b.x-a.x)*i/n+0.5, a.y+(b.y-a.y)*i/n, ...col);
  }
}
// 자동 감지 천 경계(주황), 보정 후 경기면(노랑)
for(let i=0;i<4;i++){ lineP(ac[i],ac[(i+1)%4],[255,120,0]); }
for(let i=0;i<4;i++){ lineP(cs2[i],cs2[(i+1)%4],[255,220,0]); }
const mcol={cue:[255,255,255],cue2:[255,200,0],r1:[255,0,60],r2:[255,90,160]};
for(const k in marks){ circle(marks[k].x,marks[k].y,14,mcol[k]); cross(marks[k].x,marks[k].y,4,mcol[k]); }

// ── PNG 인코딩 ──
function writePNG(path,w,h,rgba){
  const raw=Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){
    raw[y*(w*4+1)]=0;
    rgba.subarray?raw.set(rgba.subarray(y*w*4,(y+1)*w*4),y*(w*4+1)+1)
      :raw.set(rgba.slice(y*w*4,(y+1)*w*4),y*(w*4+1)+1);
  }
  const idat=zlib.deflateSync(raw);
  const chunks=[];
  const crcTable=[];
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,dataB)=>{
    const len=Buffer.alloc(4); len.writeUInt32BE(dataB.length);
    const t=Buffer.from(type);
    const c=Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t,dataB])));
    return Buffer.concat([len,t,dataB,c]);
  };
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const png=Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr), chunk('IDAT',idat), chunk('IEND',Buffer.alloc(0))]);
  fs.writeFileSync(path,png);
}
writePNG(require('path').join(require('os').tmpdir(),'hb-real-annotated.png'),W,H,Buffer.from(data.buffer));
console.log('→ 주석 PNG 저장(tmp)');
const okBalls=['cue','cue2','r1','r2'].every(k=>res.found[k]);
const okCam=camW&&camW.z>1500&&camW.z<3000;
console.log('판정: 4공 인식', okBalls?'OK':'FAIL', '· 카메라 높이', okCam?'OK':'FAIL');
process.exit(okBalls&&okCam?0:1);
