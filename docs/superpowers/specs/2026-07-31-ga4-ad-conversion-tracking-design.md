# GA4 Ad-Conversion Tracking — Design

- **Date:** 2026-07-31
- **Status:** Approved (brainstorming), pending implementation plan
- **Owner decision required:** privacy-policy update + iOS ATT prompt (see §6, §7)

## 1. Goal

Attribute paid installs through activation to purchase so **Google Ads** can
optimize spend and report which campaigns convert. The measurable outcome is a
Google Ads conversion for `purchase` (and ideally `onboarding_completed` as an
upper-funnel signal) sourced from **Google Analytics 4 (Firebase)** on both
Android and iOS.

This is **Approach A** (chosen 2026-07-31): GA4 → Google Ads, _no_ GTM container
in this pass. A GTM container can be layered on later entirely in the console
with zero code change if marketing ever needs to reconfigure tags without an app
release.

## 2. Non-goals (YAGNI)

- **No GTM container now.** Deferred; addable in-console later.
- **No replacing or shrinking PostHog.** PostHog remains the primary
  product-analytics system, unchanged.
- **No screen-view autocapture, no user properties, no content parameters** in
  GA4.
- **No backend GA4 Measurement Protocol** in this pass (see §9 for the one place
  this is a noted follow-up: `trial_started`).

## 3. Architecture — additive, funnel-only

PostHog stays exactly as-is: the typed, compile-time-enforced no-content catalog
(`@aura/shared`), autocapture OFF, `posthog-node` on the backend, super
properties. GA4 is a **thin secondary sink** that receives **only** an allowlist
of ad-funnel events.

The existing `src/lib/analytics.ts` wrapper stays the single emitter ("one
emitter per event", 13 §3). Inside its `capture`, an **allowlist fan-out**
forwards a whitelisted subset to a new GA4 module. Feature code is **not**
touched — the funnel events already fire from their existing call sites.

### Event mapping (client-side)

| Catalog event          | Existing emit site                  | GA4 event name                  | Funnel role |
| ---------------------- | ----------------------------------- | ------------------------------- | ----------- |
| `app_first_open`       | `src/lib/appOpen.ts`                | GA4 automatic `first_open`      | install     |
| `onboarding_completed` | `src/features/onboarding/commit.ts` | `onboarding_completed` (custom) | activation  |
| `purchase_completed`   | `app/paywall.tsx`                   | `purchase` (GA4 recommended)    | conversion  |

Notes:

- `first_open` is **logged automatically** by GA4 on first launch — we do not
  emit it manually; the catalog `app_first_open` stays PostHog-only, and GA4's
  own `first_open` covers install attribution.
- `purchase` is mapped to the GA4 **recommended** event name so Ads recognizes
  it. No monetary value/params are sent (structural only — see §6); if Ads later
  needs value-based bidding, adding `value`/`currency` from the RevenueCat SKU is
  a scoped follow-up.
- `trial_started` is **not** emitted client-side (it fires from the backend
  RevenueCat webhook, 12 §5). It is therefore **out of scope for the client**;
  see §9 for the backend follow-up if trial conversions are needed in Ads.

## 4. Client changes

### Dependencies

- `@react-native-firebase/app`
- `@react-native-firebase/analytics`
- `expo-tracking-transparency` (iOS ATT — see §7)
- Expo config plugin for `@react-native-firebase/app`; likely
  `expo-build-properties` with `ios.useFrameworks: "static"` (React Native
  Firebase requirement on iOS — same class of pod-config wrinkle already handled
  for AppCheckCore in `plugins/withGoogleSignInPods.js`).

Reuses the **existing** `google-services.json` / `GoogleService-Info.plist`
already wired for auth/FCM and already uploaded as EAS file secrets. Requires a
native rebuild — the app already ships a custom dev client.

### New module: `src/lib/ga4.ts`

- `initGa4()` — enables/disables collection based on environment (§8), sets
  `setAnalyticsCollectionEnabled` accordingly. Called from `useBoot.ts` right
  beside the existing `initAnalytics()` (line ~48).
- `logFunnelEvent(name, params?)` — thin wrapper over
  `analytics().logEvent(...)`. Only ever called with allowlisted names.
- A no-op when GA4 is disabled (dev), mirroring PostHog's "no key = no-op".

### Wrapper fan-out: `src/lib/analytics.ts`

- A `const GA4_FUNNEL_EVENTS = new Set([...])` allowlist of catalog event names.
- Inside `capture`: after the PostHog call, if the event is in the allowlist and
  GA4 is enabled, call `logFunnelEvent(mappedName)`. The mapping table
  (catalog → GA4 name) lives here next to the allowlist.

## 5. Component boundaries

- `ga4.ts` — owns the Firebase Analytics SDK. Single dependency surface for GA4;
  swappable/mockable in tests. Does not know about the catalog.
- `analytics.ts` — owns the allowlist + mapping and the fan-out decision. Knows
  the catalog, does not know Firebase internals.
- This keeps "what goes to GA4" (a product/privacy decision) in one readable
  place, separate from "how GA4 works".

## 6. Privacy posture (explicit founder decision)

- **No content ever reaches GA4** — same rule as 13 §2. Only the structural
  event _name_ plus Google's app-instance id. No struggle text, names, or any
  free text. Enforced by the allowlist (only known structural events) and by
  sending **no custom params** in this pass.
- **Autocollection trimmed:** GA4's structural auto-events (`first_open`,
  `session_start`) are kept (needed for install attribution); **no** screen-view
  tracking is enabled and no content params are attached.
- **This is a genuinely new data-sharing relationship with Google** (device/ad
  identifiers) that did not exist before. Required sub-task: add a Google
  Analytics / Google Ads disclosure line to the privacy policy in
  `apps/backend/src/legal/legal.content.ts`. **Blocks store submission** of the
  build that includes this.

## 7. iOS specifics (in scope this pass)

- **App Tracking Transparency:** add `expo-tracking-transparency`; request the
  ATT prompt at a considered, non-intrusive moment (proposed: on first Home
  landing, after the Letter/paywall — never mid-onboarding, consistent with the
  notification-permission timing in 11 §2). If denied, GA4 still functions with
  reduced (non-IDFA) attribution — no feature breaks.
- **SKAdNetwork:** add the SKAdNetwork identifier list (Google + partners) to the
  iOS Info.plist via app config, so iOS install attribution works without IDFA.
- The ATT prompt is a new iOS permission dialog and must be described in the App
  Store privacy questionnaire ("Data used to track you").

## 8. Environment gating

- GA4 initializes with collection **enabled only** when `APP_ENV` is
  `production` or `preview` (read via `process.env.APP_ENV`, the pattern already
  used in `src/lib/instrument.ts`). Local `development` calls
  `setAnalyticsCollectionEnabled(false)` → complete no-op, so local dev and the
  test suite never emit to Google.
- No new secret in the repo — GA4 config comes from the Google config files
  already present on EAS.

## 9. Backend follow-up (noted, not in this pass)

`trial_started` fires only from the backend RevenueCat webhook. If Google Ads
needs trial-start as a conversion, forward it from the backend via the **GA4
Measurement Protocol** (using the app-instance id captured client-side). This is
a separate, self-contained spec; explicitly out of scope here.

## 10. Console setup (manual runbook — documented, not code)

Delivered as a step-by-step doc (e.g. `docs/setup/ga4-ads-conversion-setup.md`)
covering:

1. Confirm/enable the GA4 property in the existing Firebase project `aura-ca0d1`
   for **both** the Android and iOS apps.
2. Mark `onboarding_completed` and `purchase` as **Key events** in GA4.
3. **Link GA4 ↔ Google Ads**; import the conversions into Google Ads.
4. Verify with Firebase **DebugView** on a real device.
5. (Deferred) how to add a GTM container on top later with no code change.

## 11. Testing

- **Unit:** the allowlist fan-out — only allowlisted catalog events reach the GA4
  logger (a non-allowlisted event must not); the GA4 logger is a no-op when
  disabled; the catalog→GA4 name mapping is correct. GA4 SDK is mocked.
- **Privacy regression:** a test asserting no custom content params are passed to
  GA4 (the fan-out sends name only).
- **Manual:** Firebase DebugView shows `first_open`, `onboarding_completed`,
  `purchase` from a real device build; Google Ads shows the imported conversion.

## 12. Risks

- **iOS pods:** `@react-native-firebase` on Expo iOS may require
  `useFrameworks: "static"`, which can interact with existing static-linkage pod
  fixes (Google Sign-In / AppCheckCore). Mitigation: reuse the existing
  dangerous-mod Podfile pattern; verify a clean `pod install` early.
- **Native weight / privacy optics:** adds a Google analytics SDK to a
  privacy-forward app. Mitigated by the funnel-only allowlist and no-content
  rule, but it is a real posture change (owner-accepted).
- **Store review:** iOS privacy questionnaire + privacy-policy line are
  submission blockers if missed (tracked in §6/§7).

## 13. Rollout order

1. SDK + config plugin + `ga4.ts` + allowlist fan-out (Android functional).
2. Privacy-policy line (`legal.content.ts`).
3. iOS ATT (`expo-tracking-transparency`) + SKAdNetwork Info.plist.
4. Tests.
5. Console runbook + GA4↔Ads linking (manual).
6. Preview build → DebugView verification → production.
