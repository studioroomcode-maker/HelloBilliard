// Hello Billiard 테스트 러너 — 모든 검증을 순차 실행하고 기대 마커를 확인한다.
// 사용: node tests/run-all.js  (CI와 로컬 공용, 순수 Node — 의존성 없음)
//
// exit0: 스크립트 자체가 실패 시 exit 1을 내는 엄격 테스트
// match: stdout에 반드시 나타나야 하는 마커 (몬테카를로 분산이 있는 테스트는
//        카드 개수 대신 '크래시 없이 해당 단계 도달'을 검증하는 관대한 마커 사용)
const { spawnSync } = require('child_process');
const path = require('path');

const CASES = [
  // ── 물리 정확도 (엄격 — 실측 앵커) ──
  { f: 'validate-path.js', exit0: true, match: [/전체 검증 통과/] },
  // ── 사진 인식 합성 5시나리오 (엄격 — 결정적) ──
  { f: 'vision-html-test.js', exit0: true, match: [/5개 시나리오 전체 통과/] },
  // ── 사진 인식 실환경 (엄격 — 필드 사진 픽스처) ──
  { f: 'real-test.js', exit0: true, match: [/4공 인식 OK/, /카메라 높이 OK/] },
  { f: 'g3-photo-test.js', exit0: true, match: [/3구 매핑 가능.*OK/] },
  { f: 'portrait-test.js', exit0: true, match: [/세로 방향 OK/, /4공 인식 OK/] },
  // ── 앱 통합 (관대 — MC 분산 허용, 크래시/단계 도달 검증) ──
  { f: 'smoke-test.js', match: [/스크립트 로드\/초기화 성공/, /4구 solve/, /3구 파이브앤하프/] },
  { f: 'smoke-test2.js', match: [/차단 배치 solve/] },
  { f: 'g3-test.js', match: [/득점 라인/, /단-장-장/, /물리 경로 제안/] },
  { f: 'skill-test.js', match: [/4구 \[beg\]/, /4구 \[adv\]/, /혼합 당점 배제 확인: OK/] },
  { f: 'crule-test.js', match: [/규칙 \[any\]/, /규칙 \[1\]/, /규칙 \[3\]/] },
  { f: 'sort-test.js', match: [/쿠션수순\(재계산\)/, /잠금 필터 유지: OK/, /추천순/] },
  // ── UI 마크업 단위 검증 ──
  { f: 'requested-ui-test.js', exit0: true, match: [/요청 UI 회귀 검사 통과/] },
  { f: 'overlap-test.js', exit0: true, match: [/겹침 검증 회귀: OK/] },
  { f: 'block-test.js', match: [/경고 포함: OK/] },
  { f: 'block2-test.js', match: [/제2적구 출발-경로 차단 검사 통과/] },
  { f: 'first-entry-test.js', exit0: true, match: [/첫 진입 배치 검사 통과/] },
  { f: 'power-test.js', exit0: true, match: [/추천 파워 실측 검사 통과/] },
  { f: 'exp-badge-test.js', exit0: true, match: [/실험적 배지 검사 통과/] },
  { f: 'g3-settings-test.js', exit0: true, match: [/3구 설정 노출 검사 통과/] },
  { f: 'showall-test.js', exit0: true, match: [/선택 경로만 표시 검사 통과/] },
  { f: 'path-physical-test.js', exit0: true, match: [/경로 물리 성립성 검사 통과/] },
  { f: 'kiss-test.js', exit0: true, match: [/키스 정직성 검사 통과/] },
  { f: 'skill-fallback-test.js', exit0: true, match: [/실력 폴백 검사 통과/] },
  { f: 'side-check2.js', match: [/좌\/우 라벨 포함 여부: OK/] },
  { f: 'badge-check.js', match: [/gather 배지 포함: OK/] },
];

let failed = 0;
const t0 = Date.now();
for (const c of CASES) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, c.f)], {
    encoding: 'utf8', timeout: 360000,   // 3구 물리 경로 테스트는 solve3를 수십 번 호출 — 느린 머신 여유
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const problems = [];
  if (r.error) problems.push('실행 오류: ' + r.error.message);
  if (c.exit0 && r.status !== 0) problems.push('exit ' + r.status);
  for (const m of c.match) if (!m.test(out)) problems.push('마커 누락: ' + m);
  const sec = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length) {
    failed++;
    console.log(`✗ FAIL ${c.f} (${sec}s)`);
    for (const p of problems) console.log('    - ' + p);
    console.log(out.split('\n').slice(-12).map(l => '    | ' + l).join('\n'));
  } else {
    console.log(`✓ PASS ${c.f} (${sec}s)`);
  }
}
console.log(`\n${CASES.length - failed}/${CASES.length} 통과 · 총 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
