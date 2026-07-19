# 구글 플레이스토어 출시 준비 (TWA)

Hello Billiard(PWA)를 **TWA(Trusted Web Activity)**로 감싸 플레이스토어에 올리는 절차.
앱은 웹(Vercel)을 그대로 띄우므로, 웹을 업데이트하면 앱 내용도 자동 갱신된다.

- 도메인: `https://hellobilliard.studioroomkr.com`
- 제안 패키지명: **`com.studioroomkr.hellobilliard`** (한 번 정하면 영구 — 바꾸려면 새 앱)

---

## 0. 먼저 정할 것

- [ ] **패키지명 확정** (`com.studioroomkr.hellobilliard` 또는 원하는 것). 출시 후 변경 불가.
- [ ] **결제 전략** (⚠ 가장 중요 — 아래 "결제 정책" 참고)
  - A) 스토어 버전은 Pro 판매를 앱 안에서 안 함(코드 입력만) → 가장 빠름
  - B) Google Play 결제(Play Billing) 연동 → 정석, 수수료 15~30%
  - C) 스토어 버전은 전부 무료

---

## 1. TWA 패키지 생성 (PWABuilder — 코드 불필요)

1. https://www.pwabuilder.com 접속 → URL에 `https://hellobilliard.studioroomkr.com` 입력 → **Start**
2. 매니페스트/서비스워커/보안 점검 통과 확인 (지금 상태로 통과해야 정상)
3. **Package For Stores → Android → Generate Package**
   - Package ID: `com.studioroomkr.hellobilliard`
   - App name: `Hello Billiard`
   - Signing key: **"Create new"** 선택 → PWABuilder가 키를 만들어 줌
     (⚠ 내려받은 `signing.keystore`와 비밀번호를 **안전하게 영구 보관** — 분실 시 앱 업데이트 불가)
4. 산출물(zip) 안에 들어 있는 것:
   - `app-release-bundle.aab` ← Play에 업로드할 파일
   - `signing-key-info.txt` ← **SHA-256 지문**이 여기에 있음
   - `assetlinks.json` (참고용 — 이미 이 저장소에 넣어둠)

> Bubblewrap CLI로도 가능(`npx @bubblewrap/cli init --manifest .../manifest.webmanifest`). PWABuilder가 더 쉬움.

---

## 2. assetlinks.json에 지문 넣기 (도메인 검증)

이 저장소에 `.well-known/assetlinks.json`을 이미 만들어 뒀다. **지문만 채우면 된다.**

1. 다음 두 지문을 확보:
   - **PWABuilder 업로드 키** SHA-256 (`signing-key-info.txt`)
   - **Play 앱 서명 키** SHA-256 (Play Console → 앱 → **테스트 및 출시 › 앱 무결성 › 앱 서명** 에서 확인)
     → Play App Signing을 쓰면 최종 서명이 이 키로 바뀌므로 **이 지문이 반드시 필요**하다.
2. `.well-known/assetlinks.json`의 `REPLACE_WITH_...` 두 자리에 지문을 붙여넣는다.
   (둘 다 넣어두면 어느 서명이든 검증 통과 — 권장)
3. 커밋·배포 후 확인:
   ```
   curl https://hellobilliard.studioroomkr.com/.well-known/assetlinks.json
   ```
   → JSON이 그대로 떠야 함. Google 검증 도구:
   https://developers.google.com/digital-asset-links/tools/generator

검증이 되면 앱 실행 시 **상단 주소창(URL bar)이 사라진다.** 안 되면 지문/패키지명 불일치이니 다시 확인.

---

## 3. Play Console 등록

1. https://play.google.com/console — 개발자 계정 등록 (**1회 $25**)
2. 앱 만들기 → 이름 `Hello Billiard`, 언어 한국어, 앱/무료 선택
3. **프로덕션(또는 내부 테스트) → 새 버전 → `app-release-bundle.aab` 업로드**
   - Play App Signing 자동 사용 → 2단계에서 이 서명 키 지문을 assetlinks에 넣어야 함
4. 검토 후 출시

---

## 4. 스토어 등록정보에 필요한 자료

- [ ] **앱 아이콘 512×512** PNG (있음: `icons/icon-512.png` 재사용 가능)
- [ ] **피처 그래픽 1024×500** PNG/JPG (신규 제작 필요 — `design/`의 로고/인트로 활용)
- [ ] **폰 스크린샷 2~8장** (16:9 또는 9:16, 최소 320px) — 4구 경로/3구 시스템/사진 인식 화면 캡처
- [ ] **짧은 설명** (80자 이내)
- [ ] **전체 설명** (4000자 이내)
- [ ] **개인정보처리방침 URL**: `https://hellobilliard.studioroomkr.com/privacy.html` (있음 ✓)
- [ ] **카테고리**: 스포츠 또는 게임>스포츠
- [ ] **콘텐츠 등급 설문** (전체이용가 예상)
- [ ] **타깃 연령/광고 포함 여부** (광고 없음)

### 데이터 보안(Data Safety) 양식
- 수집·공유하는 데이터 **없음**
- 카메라/사진: **기기 내에서만 처리, 서버 전송·저장 없음** (privacy.html과 동일)
- → "데이터를 수집하지 않음"으로 신고 가능 (사실과 일치)

---

## 5. 참고 — 짧은/전체 설명 초안 (수정해서 사용)

**짧은 설명(80자):**
> 사진 한 장으로 당구 공 배치를 읽고 4구 득점 경로와 3구 시스템을 계산해 주는 AI 코치.

**전체 설명(초안):**
> Hello Billiard는 당구대 사진을 찍으면 공 배치를 인식해, 물리 시뮬레이션으로
> 4구 득점 경로를 성공률과 함께 제안하고 3구(쓰리쿠션) 파이브앤하프·플러스·볼
> 시스템을 계산해 주는 당구 학습 도구입니다.
>
> • 사진 인식 — 당구대 사진으로 공 위치 자동 인식 (기기 안에서만 처리, 서버 전송 없음)
> • 4구 경로 — 실측 분리각·회전·다중 경로, 실력별 난이도, 성공률·공 모임도
> • 3구 시스템 — 파이브앤하프/플러스/볼 시스템 + 물리 경로(대회전·와리가리 등 정석 코스)
> • 설치 없이 무료, 오프라인 동작

---

## ⚠ 결제 정책 (반드시 확인)

현재 Pro는 **외부 링크 결제 + 수동 코드** 방식이다. Google Play는 **앱 내 디지털 상품 판매 시
Play 결제 사용을 요구**하므로, 스토어 버전에서 외부 결제로 Pro를 팔면 정책 위반이 될 수 있다.

- 가장 간단: **스토어 버전은 앱 안에서 Pro를 팔지 않기** (코드 입력창만 두고, 코드는 웹사이트에서 판매)
- 정석: **Play Billing(인앱결제) 연동**
- 또는: **스토어 버전은 전부 무료**로 배포

> 한국은 인앱결제 대체결제 관련 법(전기통신사업법)이 있어 Google이 '대체 결제'를 일부 허용하지만,
> 그래도 Google 결제 시스템 연동이 필요하다. 링크만 던지는 방식은 피할 것.

---

## 요약 체크리스트

- [ ] 패키지명 확정
- [ ] 결제 전략 결정
- [ ] PWABuilder로 AAB + 서명키 생성 (키 백업!)
- [ ] SHA-256 2종 → `.well-known/assetlinks.json` 채우고 배포 → curl 확인
- [ ] Play Console 계정($25) → 앱 생성 → AAB 업로드
- [ ] 피처 그래픽 1024×500 + 스크린샷 제작
- [ ] 짧은/전체 설명, 개인정보 URL, 데이터 보안, 콘텐츠 등급 입력
- [ ] 내부 테스트로 먼저 검증 → 프로덕션 출시
