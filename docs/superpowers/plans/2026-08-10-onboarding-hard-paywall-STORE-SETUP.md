# Hard paywall — store & env prerequisites (must be done before shipping)

The code enforces the gate, but three things live outside the app. Without them the
wall either shows no trial, gets rejected at review, or does nothing.

1. **7-day free-trial intro offer** on the HERO (annual) subscription product, in BOTH
   App Store Connect and Google Play Console. RevenueCat surfaces it as
   `introPrice.price === 0`; the app then shows **"Start your free trial"** on the CTA.
   Without it, the wall shows the paid CTA only. (Annual is the pre-selected hero on the
   wall; the fallback pricing table's `hasTrial` flag is display-only and cannot be
   charged.)

2. **`EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` must be set** for the
   production build. The footer hides a link it lacks, and Apple **rejects**
   auto-renewable-subscription apps with no functional Terms (EULA) + Privacy links. A
   hard wall with no legal links is a guaranteed rejection.

3. **RevenueCat keys must be present in the production build**
   (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`). With no key
   the gate is not enforceable — by design, so the app is never bricked — and **everyone
   reaches Home**. A production build MUST carry the keys or the wall does nothing.

## On-device QA (Moto / iOS)

- Finish onboarding on a build with a real offering → wall with **no ✕**, Android back
  does not exit → purchase (or start trial) → Home.
- Kill + relaunch while unsubscribed → wall again (no bypass).
- Relaunch as a subscriber → straight to Home, no wall flash.
- A build with no RC key → straight to Home (no wall) — confirms the escape hatch.
