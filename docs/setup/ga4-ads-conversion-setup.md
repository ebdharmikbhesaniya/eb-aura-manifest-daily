# GA4 → Google Ads Conversion Setup (runbook)

The app already logs the ad-conversion funnel to GA4 (Firebase). These are the
**console** steps — done once, no code change — to make Google Ads report those
conversions. See the design spec `docs/superpowers/specs/2026-07-31-ga4-ad-conversion-tracking-design.md`.

Firebase project: **`aura-ca0d1`**. App bundle id (both platforms):
**`com.aura.manifestdaily`**.

## What the app sends (already built)

| GA4 event              | When                 | Source                                      |
| ---------------------- | -------------------- | ------------------------------------------- |
| `first_open`           | first launch         | GA4 automatic                               |
| `onboarding_completed` | onboarding finishes  | fan-out from `analytics.capture`            |
| `purchase`             | a purchase completes | fan-out (`purchase_completed` → `purchase`) |

Only these leave for GA4, by name only — no content, no params (privacy §6).
`trial_started` is backend-only and **not** sent (deferred; see the spec §9).

## 1. Enable GA4 on the Firebase project

1. Firebase Console → project **aura-ca0d1** → ⚙ **Project settings** →
   **Integrations** → **Google Analytics** → **Enable** (or confirm enabled).
2. Confirm a GA4 **property** is linked and both apps (Android
   `com.aura.manifestdaily`, iOS `com.aura.manifestdaily`) report into it.

## 2. Verify events arrive (DebugView)

1. Build a **preview** app (see §5) and install it on a device.
2. Enable debug mode:
   - **Android:** `adb shell setprop debug.firebase.analytics.app com.aura.manifestdaily`
   - **iOS:** add the launch argument `-FIRDebugEnabled` (Xcode scheme, or a dev build).
3. Firebase Console → **Analytics → DebugView**. Open the app, finish
   onboarding, run a sandbox purchase. Expect to see **`first_open`**,
   **`onboarding_completed`**, **`purchase`**.
   - Note: GA4 collection is enabled only in `production`/`preview` builds
     (`APP_ENV`); a local `development` build sends nothing by design.

## 3. Mark Key events (conversions) in GA4

1. GA4 → **Admin** → **Events** (under Data display).
2. Toggle **`onboarding_completed`** and **`purchase`** as **Key events**.
   (`first_open` is available too but is usually left as an upper-funnel signal.)

## 4. Link Google Ads and import conversions

1. GA4 → **Admin** → **Product links** → **Google Ads links** → **Link** your
   Google Ads account.
2. Google Ads → **Goals → Conversions → Summary** → **+ New conversion action**
   → **Import** → **Google Analytics 4 properties** → select `purchase` (and
   `onboarding_completed` if you want it as a secondary/observe conversion).
3. Set `purchase` as the primary conversion for bidding; leave
   `onboarding_completed` as **Secondary/observation** unless you deliberately
   want to bid on activations.

## 5. Build for verification

```
cd apps/mobile
eas build --platform android --profile preview   # and/or --platform ios
```

iOS is the real test of the static-frameworks pod graph (`expo-build-properties`
`useFrameworks: static` interacting with the Google Sign-In pods). Verify a
clean build before relying on it.

## 6. iOS specifics (already in the app)

- **ATT** prompt (`expo-tracking-transparency`) shows once on first Home landing;
  a denial is fine — GA4 still works without the IDFA.
- **SKAdNetwork** id `cstr6suwn9.skadnetwork` is in `Info.plist`; add ad
  partners' SKAdNetwork ids as campaigns expand.
- In **App Store Connect → App Privacy**, declare **"Data used to track you"**
  (device id / IDFA for ad measurement). The privacy policy already discloses
  Google Analytics/Ads (`apps/backend/src/legal/legal.content.ts`).

## 7. Deferred follow-ups (not built)

- **GTM container:** can be added later via Firebase → Google Tag Manager with
  **no app code change**, if marketing needs to add/modify tags without a
  release.
- **`trial_started` conversion:** forward it from the backend RevenueCat webhook
  via the **GA4 Measurement Protocol** (needs the app-instance id captured
  client-side). Separate spec.
- **Purchase `value`/`currency`:** the app sends `purchase` with no value. For
  value-based bidding, add value + currency from the RevenueCat SKU (scoped code
  change).
