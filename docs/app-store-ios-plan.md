# Finapple iOS App Store Plan

## Current status

- App Store Connect, In-App Purchase creation, and TestFlight distribution require an active Apple Developer Program membership first.

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

1. Join Apple Developer Program and unlock App Store Connect access.
2. Confirm your final bundle id and update it in the project if needed.
3. Open Xcode with `npm run cap:open:ios`.
4. Add app icons, launch screen, privacy strings, signing, and Sign in with Apple capability.
5. Create the App Store subscription product in App Store Connect.
6. Create the App Store consumable product for `Survival Coin Pack 10`.
7. Create the matching entitlement and offering in RevenueCat.
8. Set `VITE_REVENUECAT_APPLE_API_KEY`, `VITE_REVENUECAT_ENTITLEMENT_ID`, `VITE_REVENUECAT_OFFERING_ID`, `VITE_REVENUECAT_SURVIVAL_COIN_OFFERING_ID`, and `VITE_REVENUECAT_SURVIVAL_COIN_PACKAGE_ID`.
9. Test with Sandbox accounts in TestFlight before submission.

## App Review risks to avoid

- Do not show Toss, Kakao, Stripe, or bank transfer inside the iOS app for premium unlocks.
- Do not link users from the iOS app to an external web checkout for digital content.
- Make sure account deletion and privacy policy are available.
- If login providers change, verify whether Sign in with Apple is required.
