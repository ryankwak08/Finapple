# Finapple iOS App Store Plan

## Current status

- The app is a Vite web app wrapped for iOS with Capacitor.
- Premium unlocks digital learning content.
- Because of that, the iOS app must use Apple's In-App Purchase flow instead of Toss, Kakao, Stripe, or bank transfer.

## What is already done

- Added Capacitor dependencies.
- Added `capacitor.config.ts`.
- Added npm scripts for syncing and opening the iOS project.
- Hid external premium payment methods when the app runs as a native iOS app.
- Added RevenueCat-based iOS paywall loading, purchase, and restore hooks in the premium page.
- Added automatic premium flag syncing from RevenueCat entitlement to Supabase user metadata.

## Next steps

1. Create the iOS project with `npx cap add ios`.
2. Open Xcode with `npm run cap:open:ios`.
3. Replace the temporary app id `com.finapple.app` with your real bundle id.
4. Add app icons, launch screen, privacy strings, and signing.
5. Create the App Store subscription product in App Store Connect.
6. Create the matching entitlement and offering in RevenueCat.
7. Set `VITE_REVENUECAT_APPLE_API_KEY`, `VITE_REVENUECAT_ENTITLEMENT_ID`, and `VITE_REVENUECAT_OFFERING_ID`.
8. Test with Sandbox accounts in TestFlight before submission.

## App Review risks to avoid

- Do not show Toss, Kakao, Stripe, or bank transfer inside the iOS app for premium unlocks.
- Do not link users from the iOS app to an external web checkout for digital content.
- Make sure account deletion and privacy policy are available.
- If login providers change, verify whether Sign in with Apple is required.
