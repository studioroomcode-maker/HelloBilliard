// 요청 UI 회귀: 사진 돋보기, 필터 잠금, 다크 기본값, 안내문, 3구 초구 빨간공 우선.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const checks = [
  ['저장 테마가 없을 때 다크 기본값', /if\(!t\)\s*t='dark';/.test(html)],
  ['성공률순 버튼 잠금', /data-sort="prob"[^>]*class="sort-locked"[^>]*disabled[^>]*aria-disabled="true"/.test(html)],
  ['공모임순 버튼 잠금', /data-sort="gather"[^>]*class="sort-locked"[^>]*disabled[^>]*aria-disabled="true"/.test(html)],
  ['정렬 입력도 추천·쿠션만 허용', /G4_SORT_ENABLED=new Set\(\['best','cush'\]\)/.test(html)],
  ['사진 공용 돋보기 제공', /window\.hbDrawPhotoLoupe=function/.test(html)],
  ['4구 사진 모서리·공 지정에 돋보기 연결', /photoDrag>=0\?photoCorners\[photoDrag\]:photoLoupePoint/.test(html)],
  ['3구 사진 모서리·공 지정에 돋보기 연결', /p3Drag>=0\?p3Corners\[p3Drag\]:p3LoupePoint/.test(html)],
  ['4구 인식 완료 촬영 안내', /쿠션의 네 모서리가 모두 나오도록 찍어주세요\./.test(html)],
  ['3구 정식 초구 좌표 판정', /function atPreset3\(\)/.test(html)],
  ['3구 초구는 빨간공 우선', /opening=atPreset3\(\), openingFirst='target'/.test(html)],
  ['현장 UX 토큰 시트 연결', /href="tokens\.css"/.test(html)],
  ['0.5배 광각 카메라 도우미', /window\.hbWideCamera=.*getUserMedia/s.test(html)],
  ['4구 사진 결과창 제공', /id="g4-photoResult"[\s\S]*id="g4-photoRoutePicks"/.test(html)],
  ['3구 사진 결과창 제공', /id="g3-photoResult"[\s\S]*id="g3-photoRoutePicks"/.test(html)],
  ['사진 결과에서 쿠션 조건 즉시 재계산', /if\(photoH[\s\S]*showPhotoResult4Loading\(\);\s*requestRecalc\(\)/.test(html)],
  ['그래픽 공 표시 반지름 확대', /window\.hbVisualBallRadius=function[\s\S]*Math\.max\(physicalR,6\//.test(html)],
  ['4구 현장 안정성 점수 적용', /route\.stabilityPenalty=routeStabilityPenalty4\(route\)[\s\S]*route\.score-=route\.stabilityPenalty/.test(html)],
  ['3구 현장 안정성 후보 필터', /function routeStabilityPenalty3[\s\S]*const steady=kept\.filter/.test(html)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`요청 UI 회귀 ${failed}건 실패`);
  process.exit(1);
}
console.log('요청 UI 회귀 검사 통과');
