# Apple Developer 가입 후 해야 할 일

최종 업데이트: 2026-04-17

## 1) Apple Developer Program 가입

1. Apple ID 준비
- 앱 출시용으로 계속 사용할 Apple ID를 정합니다.
- 가능하면 개인용 Apple ID와 분리해서, 앱 운영 전용 Apple ID를 쓰는 편이 관리가 쉽습니다.

2. Apple Developer 사이트 접속
- `https://developer.apple.com/programs/` 에 들어갑니다.
- `Enroll` 또는 가입 버튼을 눌러 진행합니다.

3. 가입 유형 선택
- 개인으로 출시할지, 사업자/법인으로 출시할지 정합니다.
- 사업자명으로 앱을 올리고 싶다면 법인/사업자 정보가 필요합니다.

4. 기본 정보 입력
- 이름, 주소, 전화번호, 이메일을 입력합니다.
- 결제 수단을 등록하고 연회비를 결제합니다.

5. 가입 승인 확인
- 승인 후 `App Store Connect` 와 `Certificates, Identifiers & Profiles` 에 접근 가능한지 확인합니다.

## 2) 가입 직후 가장 먼저 할 것

1. App Store Connect 열기
- `https://appstoreconnect.apple.com/`
- 로그인 후 약관 동의가 나오면 먼저 처리합니다.

2. Certificates, Identifiers & Profiles 열기
- `https://developer.apple.com/account/resources/`
- 여기서 Bundle ID와 앱 capability를 관리합니다.

3. 현재 앱 기준 Bundle ID 확인
- 현재 프로젝트의 최종 출시용 권장 Bundle ID는 `com.hafsfinapple.mobile` 입니다.
- 날짜가 들어간 임시 ID보다, 출시 후에도 유지할 고정 ID를 쓰는 편이 안전합니다.

## 3) Bundle ID 만들기

1. `Identifiers` 로 이동
2. `+` 버튼 클릭
3. `App IDs` 선택
4. `App` 선택
5. Description 입력
- 예: `Finapple iOS`
6. Bundle ID 입력
- 예: `com.hafsfinapple.mobile`
7. Capabilities 선택
- `Sign in with Apple` 체크
8. 저장

## 4) App Store Connect에 앱 만들기

1. App Store Connect에서 `My Apps` 진입
2. `+` 버튼 클릭 후 `New App`
3. 아래 값 입력
- Platforms: `iOS`
- Name: `Finapple`
- Primary Language: `Korean`
- Bundle ID: 방금 만든 Bundle ID
- SKU: 예: `finapple-ios-001`
4. 생성

## 5) 앱 내 결제 상품 설계

현재 앱 기준으로 필요한 상품은 2개입니다.

1. 프리미엄 월 구독
- 타입: `Auto-Renewable Subscription`
- 권장 Product ID: `com.finapple.premium.monthly`
- 표시 이름 예시: `Finapple Premium Monthly`

2. 생존 코인팩 10코인
- 타입: `Consumable`
- 권장 Product ID: `com.finapple.survival.coinpack10`
- 표시 이름 예시: `Survival Coin Pack 10`

## 6) App Store Connect에서 상품 만들기

### A. 프리미엄 구독

1. 앱 선택
2. `Subscriptions` 또는 구독 메뉴 진입
3. Subscription Group 생성
- 예: `Finapple Premium`
4. Auto-Renewable Subscription 생성
- Reference Name: `Premium Monthly`
- Product ID: `com.finapple.premium.monthly`
5. 기간 선택
- `1 Month`
6. 가격 설정
7. 현지화 문구 입력
8. Review Screenshot 추가

### B. 생존 코인팩

1. 앱 선택
2. `In-App Purchases` 메뉴 진입
3. `+` 클릭
4. 타입 `Consumable` 선택
5. 입력
- Reference Name: `Survival Coin Pack 10`
- Product ID: `com.finapple.survival.coinpack10`
6. 가격 설정
7. 표시 이름/설명 입력
8. Review Screenshot 추가

## 7) RevenueCat 연결

RevenueCat에서 최소한 아래 구조를 맞추면 됩니다.

### A. 공통

1. RevenueCat 프로젝트 생성
2. iOS 앱 추가
3. App Store Connect API Key 또는 StoreKit 연동 설정
4. iOS Public SDK Key 확인

### B. 프리미엄 구독

1. Product 추가
- `com.finapple.premium.monthly`
2. Entitlement 생성
- `premium`
3. Offering 생성
- Identifier: `default`
4. 위 offering 안에 월 구독 package 연결

### C. 생존 코인팩

1. Product 추가
- `com.finapple.survival.coinpack10`
2. Offering 생성
- Identifier: `survival_coin`
3. Custom package 생성 또는 package identifier 지정
- Identifier: `coinpack10`

## 8) 코드에 넣을 환경변수

프론트 `.env` 또는 배포 환경에 아래 값을 넣습니다.

```env
VITE_REVENUECAT_APPLE_API_KEY=appl_xxxxx
VITE_REVENUECAT_ENTITLEMENT_ID=premium
VITE_REVENUECAT_OFFERING_ID=default
VITE_REVENUECAT_SURVIVAL_COIN_OFFERING_ID=survival_coin
VITE_REVENUECAT_SURVIVAL_COIN_PACKAGE_ID=coinpack10
```

## 9) Xcode에서 해야 할 것

1. `npm run cap:sync:ios`
2. `npm run cap:open:ios`
3. `Signing & Capabilities`
- Team 선택
- Bundle Identifier 확인 (`com.hafsfinapple.mobile`)
- `Sign in with Apple` capability 추가
4. Version / Build Number 설정
5. 실제 iPhone에서 실행 확인

## 10) TestFlight 전에 꼭 확인할 것

1. Apple 로그인 동작
2. 프리미엄 구독 조회
3. 프리미엄 구독 구매
4. 구독 복원
5. 생존 코인팩 구매
6. 코인 지급 반영
7. 계정 삭제

## 11) 지금 당장 사용자님이 하면 되는 순서

1. Apple Developer Program 가입
2. Bundle ID 생성
3. App Store Connect에 앱 생성
4. 프리미엄 구독과 코인팩 상품 생성
5. RevenueCat 프로젝트 연결
6. 저한테 Product ID / RevenueCat offering ID 알려주기
- 그러면 제가 `.env.example` 기준으로 최종 값 정리와 제출 전 점검을 이어서 도와드릴 수 있습니다.
