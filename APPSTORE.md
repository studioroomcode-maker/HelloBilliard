# 애플 앱스토어 출시 준비 (iOS)

Hello Billiard(PWA)를 **네이티브 래퍼(WKWebView)**로 감싸 앱스토어에 올리는 절차.
안드로이드(TWA)보다 까다롭다 — **Mac + Xcode가 필수**이고, 심사가 엄격하다.

- 도메인: `https://hellobilliard.studioroomkr.com`
- 제안 Bundle ID: **`com.studioroomkr.hellobilliard`** (Play 패키지명과 동일하게 맞춤 권장)

---

## 0. 사전 준비물 (없으면 진행 불가)

- [ ] **Apple Developer Program** 가입 — **연 $99** (개인/법인)
- [ ] **Mac** (Xcode 실행용 — Windows로는 빌드·제출 불가)
- [ ] **Xcode** (App Store 무료)
- [ ] iPhone/iPad (실기기 테스트 권장, 필수는 아님)

> Mac이 없으면: 맥 클라우드(MacStadium, MacinCloud 등) 임대, 또는 Xcode Cloud/CI 사용 가능.

---

## ⚠ 가장 큰 리스크 — 가이드라인 4.2 (최소 기능)

애플은 **"웹사이트를 그대로 포장한 앱"을 반려**한다("min functionality"). 방어 전략:

- **강조할 실질 기능**: 사진 인식(카메라)으로 공 배치 자동 인식 + **오프라인 물리 시뮬레이션**
  (네트워크 없이 동작하는 계산 엔진은 단순 웹뷰가 아니라는 강한 근거)
- **네이티브 요소 추가 권장**(반려 위험↓):
  - 카메라 직접 촬영(파일 입력 대신 네이티브 카메라 연동은 선택)
  - 햅틱 피드백, 네이티브 공유 시트, 홈 화면 위젯/단축어 등
- 심사 노트에 "on-device physics engine, works offline, camera-based table recognition" 명시

---

## 1. iOS 패키지 생성 (PWABuilder 또는 Capacitor)

### 방법 A) PWABuilder (쉬움)
1. https://www.pwabuilder.com → `https://hellobilliard.studioroomkr.com` → **Package For Stores → iOS**
2. 생성된 zip = **Xcode 프로젝트**(WKWebView로 우리 사이트를 띄움)
3. Mac에서 Xcode로 열기

### 방법 B) Capacitor (네이티브 기능 확장 쉬움 — 4.2 방어에 유리)
```
npm i -g @capacitor/cli
npx cap init "Hello Billiard" com.studioroomkr.hellobilliard --web-dir .
npx cap add ios
npx cap open ios
```
> 카메라·햅틱·공유 플러그인(@capacitor/camera 등)을 붙여 네이티브성을 높일 수 있다.

---

## 2. Xcode 설정 (⚠ iOS 필수 항목)

- [ ] **Bundle Identifier**: `com.studioroomkr.hellobilliard`
- [ ] **Signing & Capabilities**: Apple 계정 로그인 → "Automatically manage signing"
- [ ] **앱 아이콘**: `Assets.xcassets`에 1024×1024 등 세트 넣기 (PWABuilder가 생성해 줌)
- [ ] **런치 스크린**: `design/intro.jpg` 활용 가능
- [ ] **Info.plist 카메라/사진 권한 문구** — **없으면 사진 인식 시 크래시 → 심사 반려**:
  - `NSCameraUsageDescription` = `당구대 사진을 찍어 공 배치를 인식하는 데 사용됩니다. 사진은 기기 안에서만 처리됩니다.`
  - `NSPhotoLibraryUsageDescription` = `앨범에서 당구대 사진을 불러와 공 배치를 인식하는 데 사용됩니다.`
- [ ] **디바이스 회전**: 가로/세로 허용(당구대가 가로라 가로 권장)

---

## 3. App Store Connect 등록·제출

1. https://appstoreconnect.apple.com → **My Apps → +** → 새 앱
   - Bundle ID: `com.studioroomkr.hellobilliard`, SKU 임의, 이름 `Hello Billiard`
2. Xcode에서 **Product → Archive → Distribute App → App Store Connect** 업로드
   (또는 Transporter 앱 사용)
3. 빌드가 App Store Connect에 뜨면 버전에 연결 → 제출

---

## 4. 스토어 등록정보에 필요한 자료

- [ ] **앱 아이콘 1024×1024** PNG (투명/알파 없이)
- [ ] **스크린샷** (기기별 필수):
  - iPhone 6.7"(1290×2796) — 필수
  - iPhone 6.5"(1242×2688) — 필수
  - (선택) iPad 12.9" 등
  - 최소 각 1장, 권장 3~5장 (4구/3구/사진 인식 화면)
- [ ] **앱 이름 / 부제(30자) / 키워드(100자) / 설명(4000자)**
- [ ] **개인정보처리방침 URL**: `https://hellobilliard.studioroomkr.com/privacy.html` ✓
- [ ] **지원 URL** (사이트 또는 이메일 페이지)
- [ ] **카테고리**: 스포츠 (또는 유틸리티)
- [ ] **연령 등급 설문** (4+)

### App Privacy (개인정보 라벨)
- **데이터 수집 안 함** 으로 신고 가능
- 카메라/사진: **기기 내 처리, 서버 전송·저장 없음** (privacy.html과 일치)

---

## 5. 설명 초안 (Play와 공용, 수정해서 사용)

**부제(30자):** `사진으로 읽는 당구 경로 AI 코치`

**키워드(100자, 쉼표 구분):**
`당구,쓰리쿠션,3구,4구,당구경로,당구계산,빌리아드,billiard,쿠션,파이브앤하프,당구연습,대회전`

**설명:** (PLAYSTORE.md의 전체 설명과 동일 사용)

---

## 결제 버튼 숨기기 (구현 완료 — 설정 필수)

앱에 **스토어 빌드 감지**가 들어가 있다. 인식되면 Pro 모달에서
**'Pro 구매하기'·'후원하기' 버튼이 사라지고 언락 코드 입력만 남는다.**

⚠ **iOS는 자동 감지가 안 되므로 반드시 시작 URL에 플래그를 붙여야 한다:**

```
https://hellobilliard.studioroomkr.com/?store=ios
```

- PWABuilder iOS 프로젝트: 웹뷰가 로드하는 URL 상수를 위 주소로 수정
- Capacitor: `capacitor.config.json` 의 `server.url` 을 위 주소로
- 한 번 로드되면 기기에 저장돼 이후 실행에도 유지됨

> 테스트: 브라우저 콘솔에서 `__hbSetStore('ios')` → 구매 버튼 사라짐 / `__hbSetStore(null)` → 원복
> **스크린샷 촬영 전에도 반드시 적용할 것** (구매 버튼이 찍히면 반려 사유)

---

## ⚠ 결제 정책 (Play보다 더 엄격)

- 애플은 **디지털 상품에 StoreKit 인앱결제(IAP) 강제** — 수수료 15~30%.
- **외부 링크 결제**로 Pro를 팔면 **3.1.1 위반 → 반려** (애플이 특히 엄격).
- 스토어 버전 선택지:
  - (A) **앱 안에서 Pro 판매 안 함**(코드 입력만) — 단, "외부에서 구매 유도" 문구·링크도 넣으면 반려될 수 있어 주의
  - (B) **StoreKit IAP 연동** — 정석
  - (C) **전부 무료** 배포
- 현재 앱의 `Pro 구매하기` 버튼·외부 링크는 **iOS 빌드에서 반드시 숨기거나 IAP로 대체**해야 한다.

---

## 요약 체크리스트

- [ ] Apple Developer 가입($99/년) + Mac + Xcode
- [ ] Bundle ID 확정 (`com.studioroomkr.hellobilliard`)
- [ ] PWABuilder/Capacitor로 iOS 프로젝트 생성
- [ ] Info.plist에 카메라·사진 권한 문구 추가 (필수!)
- [ ] 결제: 외부링크 제거 or IAP or 무료 결정 (4.2/3.1.1 반려 방지)
- [ ] 아이콘 1024 + 기기별 스크린샷 제작
- [ ] App Store Connect 등록 → Archive 업로드 → 심사 제출
- [ ] 심사 노트에 "on-device physics + camera recognition, works offline" 명시

> Play(TWA)보다 손이 많이 간다. **안드로이드를 먼저 내고**, iOS는 4.2 대비(네이티브 기능 보강)와
> 결제 정리를 마친 뒤 진행하는 것을 권장.
