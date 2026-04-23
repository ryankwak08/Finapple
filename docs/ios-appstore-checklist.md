# Finapple iOS App Store 체크리스트

최종 업데이트: 2026-04-08

## 0) Apple 계정 준비
- [필수] Apple Developer Program 가입
- [필수] App Store Connect 접근 확인
- [필수] Certificates, Identifiers & Profiles에서 Bundle ID 생성 가능 상태 확인

## 1) 가입/동의 화면
- [필수] 이용약관 동의
- [필수] 개인정보 처리방침 동의
- [필수] 만 14세 이상 확인
- [선택] 마케팅 수신 동의 (필수와 분리)
- 약관/개인정보 전문 페이지 링크 제공 (`/terms`, `/privacy`)

## 2) 개인정보/계정 관련
- App Store Connect에 Privacy Nutrition Label 입력
- 개인정보 처리방침 URL 기재
- 앱 내 계정 삭제 기능 제공 여부 확인 (로그인 앱은 권장/사실상 필수에 가까움)
- 탈퇴 시 데이터 삭제/보관 정책 정리

## 3) iOS 빌드
```bash
npm run cap:sync:ios
npm run cap:open:ios
```

Xcode에서:
- Signing Team 선택
- Bundle Identifier 확인 (`com.hafsfinapple.mobile`)
- Version / Build Number 업데이트
- Sign in with Apple capability 추가
- 실제 기기 테스트

## 4) App Store Connect 등록
- 앱 설명/키워드/카테고리 작성
- 스크린샷 업로드 (아이폰 해상도별)
- 심사용 계정(필요 시) 제공
- 개인정보/콘텐츠 등 심사 질문 답변
- 구독 상품 등록
- Consumable 코인팩 상품 등록

## 5) TestFlight -> 심사 제출
- 내부 테스트
- 외부 테스트(선택)
- 심사 제출 및 피드백 대응
