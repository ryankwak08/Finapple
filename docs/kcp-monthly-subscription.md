# NHN KCP 월 구독 전환 가이드

## 1) 필수 환경변수

서버(`server/.env` 또는 루트 `.env`)에 아래 값을 설정합니다.

- `PAYMENT_PROVIDER=kcp`
- `KCP_SITE_CD=...`
- `KCP_CERT_INFO=...`
- `KCP_STATE_SIGNING_SECRET=...` (충분히 긴 랜덤 문자열)
- `BACKEND_PUBLIC_URL=https://api.your-domain.com`

선택값(기본값 사용 가능):

- `KCP_USE_STAGING=true` (운영은 `false`)
- `KCP_API_BASE=https://stg-spl.kcp.co.kr` (운영은 `https://spl.kcp.co.kr`)
- `KCP_TRADE_REGISTER_PATH=/std/tradeReg/register`
- `KCP_PAYMENT_API_PATH=/gw/enc/v1/payment`
- `KCP_AUTH_TRAN_CD=00300001`
- `KCP_BILLING_CHARGE_TRAN_CD=00200000`
- `KCP_SUBSCRIPTION_CRON_SECRET=...`

## 2) KCP 관리자/콘솔 설정

- 자동결제(빌링) 계약 완료
- `Ret_URL` 허용 경로 등록:
  - `https://api.your-domain.com/api/payments/kcp/billing/auth-result`

## 3) DB 스키마 적용

Supabase SQL Editor에서 아래 파일을 실행합니다.

- `supabase/billing_subscriptions.sql`

## 4) 결제 시작/승인 플로우

프론트에서 `POST /api/payments/kcp/create-billing-auth` 호출 후,
응답의 `checkoutUrl + formData`로 결제창 폼 POST를 수행합니다.

KCP 인증 완료 후 서버 콜백:

- `POST /api/payments/kcp/billing/auth-result`

서버가 배치키를 저장하고 구독 상태를 활성화한 뒤 성공/실패 페이지로 리다이렉트합니다.

## 5) 월 정기 청구(Cron)

정기 실행 엔드포인트:

- `POST /api/payments/kcp/subscriptions/charge-due`
- Header: `x-cron-secret: <KCP_SUBSCRIPTION_CRON_SECRET>`

예시:

```bash
curl -X POST https://api.your-domain.com/api/payments/kcp/subscriptions/charge-due \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_SECRET" \
  -d '{"batchSize":25}'
```

## 6) 사용자 구독 해지

- `POST /api/payments/kcp/subscriptions/cancel`
- 로그인 액세스 토큰 필요

현재 구현은 "로컬 구독 상태 해지"를 우선 처리합니다.
(필요 시 KCP 배치키 해지 API 연동을 추가로 붙이면 됩니다.)
