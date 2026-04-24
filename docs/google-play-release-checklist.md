# Google Play Release Checklist

Last updated: 2026-04-24

## 1. App Identity

- App name: Finapple
- Android package name: `com.ryankwak.finapple.app`
- Current version: `1.0`
- Current version code: `1`
- Target SDK: 36
- Minimum SDK: 24

Google Play requires new apps and updates submitted after August 31, 2025 to target Android 15 / API 35 or higher. This project currently targets API 36.

## 2. Store Listing

Prepare these assets before creating the production release.

- Short description, up to 80 characters.
- Full description.
- App icon, 512 x 512 PNG.
- Feature graphic, 1024 x 500 PNG.
- Phone screenshots, at least 2.
- Privacy policy URL: `https://finapple.xyz/privacy`
- Contact email: use the real support email before submission.

Suggested short description:

> 청소년과 청년을 위한 경제·금융 학습, 퀴즈, 용어 사전 앱

Suggested full description:

> Finapple은 경제·금융 개념을 짧게 배우고 퀴즈로 복습할 수 있는 학습 앱입니다. 청소년 금융학습, 자립준비청년, 다문화·외국인 노동자 트랙을 제공하며 경제 용어 사전, 학습 진도, 오답노트, 프리미엄 학습 기능을 지원합니다. 금융 챗봇은 교육용 일반 정보를 제공하며 금융상품 판매, 투자자문, 대출중개, 보험모집, 세무·법률 자문을 제공하지 않습니다.

## 3. App Content Declarations

Use these answers as the starting point, then confirm them in Play Console.

- App category: Education.
- Contains ads: No, unless ad SDK is added later.
- App access: Some features require login.
- Target audience: Recommended 13+ or 14+ because the app collects account data and currently requires users to confirm they are at least 14.
- News app: No.
- Government app: No.
- Financial features: The app provides financial education and general information only. It does not enable banking, lending, investment trading, insurance sales, or financial product applications.
- Health features: No.
- User-generated content: No public UGC, unless chat or profile sharing is later expanded.

## 4. Data Safety Draft

Data collected or processed by the app:

- Email address: account creation, login, support.
- User IDs or nickname: profile and leaderboard/account display.
- Photos or files: profile image if the user uploads one.
- App activity: learning progress, quiz results, premium status.
- App info and performance: crash/error logs and diagnostics if enabled by hosting or backend providers.
- Purchase history or subscription status: not collected in the first Google Play release because paid products are disabled.

Data sharing to disclose if applicable:

- Supabase for authentication and data storage.
- No Google Play Billing or Android paid product processor is used in the first Google Play release.
- OpenAI or equivalent AI provider for chatbot/quiz generation if user prompts are sent to the backend AI API.
- Hosting and infrastructure providers such as Vercel for app delivery and logs.

Security practices:

- Data is encrypted in transit.
- Users can request account deletion in the app.
- Privacy policy is available in app and on the web.

## 5. Payments

- Google Play launch version does not include paid products.
- Do not create subscriptions or in-app products in Play Console for this first release.
- Android runtime hides paid purchase flows and grants the learning features without paid checkout.
- Android Gradle linkage to RevenueCat/Billing is removed for the Play Store AAB.
- Web checkout can remain for the web version, and iOS App Store purchase setup can be handled separately later.

When paid products are added later:

- Re-enable Android RevenueCat/Billing in `android/capacitor.settings.gradle` and `android/app/capacitor.build.gradle`, or run `npx cap sync android` after intentionally restoring paid products.
- Add `VITE_REVENUECAT_GOOGLE_API_KEY=goog_...`.
- Create Play Console subscription/in-app products.
- Map those products in RevenueCat offerings.

## 6. Pre-Release Technical Checks

Run before uploading an AAB.

```bash
npm run lint
npm test
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

The upload artifact should be:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## 7. Signing

- Prefer Play App Signing in Play Console.
- Keep the upload keystore private and backed up.
- Do not commit keystore files or passwords to git.
- Add signing credentials through local Gradle properties or environment variables only.

## 8. Before Production

- Replace any placeholder customer support email, bank account, business name, and policy contact details with real information.
- Verify `/terms` and `/privacy` are publicly accessible from the production domain.
- Create an internal testing release first.
- Test login, account deletion, premium gating, finance chatbot disclaimer, and all bottom-tab navigation on a physical Android device.
