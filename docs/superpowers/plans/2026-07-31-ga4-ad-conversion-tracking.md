# GA4 Ad-Conversion Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Analytics 4 (Firebase) to the mobile app as a thin, funnel-only sink so Google Ads can track install → activation → purchase conversions, without disturbing PostHog or the app's no-content privacy stance.

**Architecture:** PostHog stays the primary analytics system unchanged. A new `src/lib/ga4.ts` owns the Firebase Analytics SDK (env-gated, no-op in dev). The existing `src/lib/analytics.ts` wrapper gains an allowlist fan-out that forwards ONLY `onboarding_completed` and `purchase_completed` to GA4 — name only, no params. iOS adds an ATT prompt + SKAdNetwork IDs. GA4↔Ads linking is a manual console runbook.

**Tech Stack:** Expo / React Native, `@react-native-firebase/app` + `@react-native-firebase/analytics`, `expo-tracking-transparency`, `expo-build-properties`, jest (`jest-expo` preset), NestJS (backend legal copy).

## Global Constraints

- **No content ever reaches GA4** — only structural event names + Google's app-instance id. The fan-out passes the event NAME only, never params (13 §2, spec §6).
- **Funnel-only allowlist:** exactly two catalog events fan out — `onboarding_completed` and `purchase_completed`. `app_first_open` does NOT (GA4 logs `first_open` automatically). Everything else is PostHog-only (spec §3).
- **GA4 event names:** `onboarding_completed` → `onboarding_completed`; `purchase_completed` → `purchase` (GA4 recommended name). No `value`/`currency` this pass (spec §3).
- **Environment gating:** GA4 collection is enabled ONLY when `process.env.APP_ENV` is `production` or `preview`; `development` disables collection (complete no-op). Mirrors PostHog "no key = no-op" (spec §8).
- **Reuses existing** `google-services.json` / `GoogleService-Info.plist` (already on EAS as file secrets). No new secret in the repo.
- **PostHog untouched.** Do not modify its behavior, events, or config.
- **Commit after every task.** End commit messages with the repo's `Co-Authored-By` trailer.

---

### Task 1: GA4 SDK wrapper (`src/lib/ga4.ts`)

A thin, catalog-unaware module that owns the Firebase Analytics SDK, gates on environment, and no-ops when disabled.

**Files:**

- Create: `apps/mobile/src/lib/ga4.ts`
- Create: `apps/mobile/src/lib/ga4.test.ts`
- Modify: `apps/mobile/jest.setup.js` (add a global mock for `@react-native-firebase/analytics`)

**Interfaces:**

- Produces:
  - `export function initGa4(): void` — enables/disables collection from `process.env.APP_ENV`.
  - `export function logGa4Event(name: string): Promise<void>` — logs a name-only event; no-op unless enabled.
  - `export function isGa4Enabled(): boolean` — for tests/wiring.

- [ ] **Step 1: Add the global native mock to `jest.setup.js`**

Append this block to `apps/mobile/jest.setup.js` (so any test importing `ga4.ts` — directly or transitively via `analytics.ts` — doesn't crash on the native module):

```js
// Firebase Analytics has no JS implementation under jest. The default export is
// a function returning an instance; the same jest.fns are closed over so tests
// can assert on `analytics().logEvent` / `setAnalyticsCollectionEnabled`.
jest.mock('@react-native-firebase/analytics', () => {
  const logEvent = jest.fn(() => Promise.resolve());
  const setAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve());
  const factory = () => ({ logEvent, setAnalyticsCollectionEnabled });
  return { __esModule: true, default: factory };
});
```

- [ ] **Step 2: Write the failing test** — `apps/mobile/src/lib/ga4.test.ts`

```ts
import analytics from '@react-native-firebase/analytics';

import { initGa4, isGa4Enabled, logGa4Event } from './ga4';

const sdk = analytics();

describe('ga4', () => {
  const ORIGINAL_ENV = process.env.APP_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.APP_ENV = ORIGINAL_ENV;
  });

  it('enables collection in production', async () => {
    process.env.APP_ENV = 'production';
    initGa4();

    expect(isGa4Enabled()).toBe(true);
    expect(sdk.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(true);
  });

  it('enables collection in preview', () => {
    process.env.APP_ENV = 'preview';
    initGa4();
    expect(isGa4Enabled()).toBe(true);
  });

  it('disables collection in development — a complete no-op', async () => {
    process.env.APP_ENV = 'development';
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    expect(sdk.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(false);

    await logGa4Event('purchase');
    expect(sdk.logEvent).not.toHaveBeenCalled();
  });

  it('logs a name-only event when enabled', async () => {
    process.env.APP_ENV = 'production';
    initGa4();

    await logGa4Event('purchase');
    expect(sdk.logEvent).toHaveBeenCalledWith('purchase');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/lib/ga4.test.ts`
Expected: FAIL — `Cannot find module './ga4'`.

- [ ] **Step 4: Write the implementation** — `apps/mobile/src/lib/ga4.ts`

```ts
import analytics from '@react-native-firebase/analytics';

/**
 * Google Analytics 4 (Firebase) — the ad-conversion sink (spec 2026-07-31).
 *
 * Deliberately catalog-unaware: it knows how to talk to Firebase, not which
 * events are allowed. The allowlist and the catalog→GA4 name mapping live in
 * `analytics.ts`, next to the one emitter, so "what Google receives" is one
 * readable, auditable decision separate from "how GA4 works".
 *
 * Collection is gated on APP_ENV: enabled only for the store-bound builds
 * (production/preview), a complete no-op in local development and under jest —
 * the same "no key = no-op" posture PostHog has (spec §8).
 */

let enabled = false;

/** Store-bound builds collect; everything else stays silent. */
function shouldEnable(): boolean {
  const env = process.env.APP_ENV;
  return env === 'production' || env === 'preview';
}

export function initGa4(): void {
  enabled = shouldEnable();
  // Fire-and-forget: nothing downstream waits on the toggle, and a rejected
  // promise here must never break boot.
  void analytics().setAnalyticsCollectionEnabled(enabled);
}

export function isGa4Enabled(): boolean {
  return enabled;
}

/**
 * Logs a single GA4 event by NAME only — never any params (spec §6: no content
 * reaches GA4). No-op unless collection is enabled.
 */
export async function logGa4Event(name: string): Promise<void> {
  if (!enabled) return;
  await analytics().logEvent(name);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/lib/ga4.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && pnpm exec tsc --noEmit`
Expected: no errors. (The `@react-native-firebase/analytics` types resolve once the dep is installed in Task 4; if `tsc` errors on the missing module here, proceed — Task 4 installs it — and re-run typecheck at the end of Task 4. If you prefer green-at-every-step, reorder Task 4 before Task 1.)

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/lib/ga4.ts apps/mobile/src/lib/ga4.test.ts apps/mobile/jest.setup.js
git commit -m "$(cat <<'EOF'
feat(mobile): GA4 SDK wrapper, env-gated and no-op in dev

Thin Firebase Analytics wrapper for ad-conversion tracking: init toggles
collection from APP_ENV (production/preview only), logGa4Event logs a name-only
event, no-op everywhere else. Catalog-unaware by design.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Allowlist fan-out in `analytics.ts`

Forward exactly the two funnel events to GA4, by name only. Everything else stays PostHog-only.

**Files:**

- Modify: `apps/mobile/src/lib/analytics.ts` (the `capture` function + new allowlist/mapping constants)
- Create: `apps/mobile/src/lib/analytics.ga4-fanout.test.ts`

**Interfaces:**

- Consumes: `logGa4Event(name)` from `./ga4` (Task 1).
- Produces: no new exports; `analytics.capture` gains the fan-out side effect.

- [ ] **Step 1: Write the failing test** — `apps/mobile/src/lib/analytics.ga4-fanout.test.ts`

```ts
// PostHog is irrelevant to this test — stub it so no real client is created.
jest.mock('posthog-react-native', () => {
  return jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    flush: jest.fn(),
  }));
});

jest.mock('./ga4', () => ({
  logGa4Event: jest.fn(() => Promise.resolve()),
  initGa4: jest.fn(),
  isGa4Enabled: jest.fn(() => true),
}));

import { logGa4Event } from './ga4';
import { analytics } from './analytics';

const mockLog = logGa4Event as jest.Mock;

describe('analytics → GA4 fan-out', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps purchase_completed to the GA4 "purchase" event', () => {
    analytics.capture('purchase_completed', { sku: 'aura_premium_annual' });
    expect(mockLog).toHaveBeenCalledWith('purchase');
  });

  it('forwards onboarding_completed under its own name', () => {
    analytics.capture('onboarding_completed', { duration_s: 120, questions_answered: 6 });
    expect(mockLog).toHaveBeenCalledWith('onboarding_completed');
  });

  it('passes the NAME only — never the catalog payload (spec §6)', () => {
    analytics.capture('purchase_completed', { sku: 'aura_premium_annual' });
    // Called with exactly one argument, the mapped name.
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog.mock.calls[0]).toEqual(['purchase']);
  });

  it('does NOT forward non-funnel events (e.g. app_open)', () => {
    analytics.capture('app_open', { source: 'cold' });
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('does NOT forward app_first_open — GA4 logs first_open itself', () => {
    analytics.capture('app_first_open');
    expect(mockLog).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/lib/analytics.ga4-fanout.test.ts`
Expected: FAIL — `logGa4Event` never called (fan-out not implemented yet).

- [ ] **Step 3: Implement the fan-out** — edit `apps/mobile/src/lib/analytics.ts`

Add the import near the top (after the existing `import { env } from './env';`):

```ts
import { logGa4Event } from './ga4';
```

Add these constants just above the `capture` function (after the `superProperties` declaration):

```ts
/**
 * The ONLY catalog events forwarded to GA4 (spec §3, funnel-only). Kept as data
 * next to the emitter so "what Google receives" is one auditable list.
 *
 * `app_first_open` is deliberately absent — GA4 logs `first_open` automatically,
 * so forwarding it would double-count installs.
 */
const GA4_EVENT_NAMES: Record<string, string> = {
  onboarding_completed: 'onboarding_completed',
  // GA4's recommended name, so Google Ads recognises the conversion.
  purchase_completed: 'purchase',
};
```

Replace the existing `capture` function body with:

```ts
function capture(event: string, payload?: Record<string, unknown>): void {
  client?.capture(event, { ...superProperties, ...payload });

  // Fan out the ad-conversion funnel to GA4 — by NAME only, never the payload
  // (spec §6: no content reaches GA4). ga4.ts no-ops unless collection is on.
  const ga4Name = GA4_EVENT_NAMES[event];
  if (ga4Name) void logGa4Event(ga4Name);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/lib/analytics.ga4-fanout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full mobile suite to confirm no regression**

Run: `cd apps/mobile && pnpm exec jest`
Expected: all suites PASS (the global mock from Task 1 keeps `./ga4`'s Firebase import safe everywhere).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/lib/analytics.ts apps/mobile/src/lib/analytics.ga4-fanout.test.ts
git commit -m "$(cat <<'EOF'
feat(mobile): fan out the ad-conversion funnel to GA4 (name only)

analytics.capture forwards exactly onboarding_completed and purchase_completed
to GA4 (purchase_completed -> "purchase"), by name only, never the payload.
Every other event stays PostHog-only. app_first_open is excluded — GA4 logs
first_open itself.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Initialize GA4 at boot

Call `initGa4()` once, beside the existing `initAnalytics()`.

**Files:**

- Modify: `apps/mobile/src/hooks/useBoot.ts` (add `initGa4()` call)
- Modify: `apps/mobile/src/hooks/useBoot.test.tsx` (mock `./ga4`, assert init called)

**Interfaces:**

- Consumes: `initGa4()` from `@/lib/ga4` (Task 1).

- [ ] **Step 1: Write the failing test** — add to `apps/mobile/src/hooks/useBoot.test.tsx`

First add a mock for ga4 alongside the existing analytics mock (near the top mocks):

```ts
jest.mock('@/lib/ga4', () => ({
  initGa4: jest.fn(),
  logGa4Event: jest.fn(),
  isGa4Enabled: jest.fn(() => false),
}));
```

Then add a test asserting init is called when a session exists. Mirror the existing test that asserts `initAnalytics` is called (find it and add beside it):

```ts
import { initGa4 } from '@/lib/ga4';

it('initializes GA4 once a session exists', async () => {
  // (reuse whatever authenticated-session setup the initAnalytics test uses)
  // ... trigger the boot flow with a session ...
  await waitFor(() => expect(initGa4).toHaveBeenCalled());
});
```

Note to implementer: open `useBoot.test.tsx`, find the existing `initAnalytics` assertion and its session setup, and duplicate that exact setup for `initGa4`. Do NOT invent new session scaffolding — reuse the file's existing harness.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/hooks/useBoot.test.tsx`
Expected: FAIL — `initGa4` not called.

- [ ] **Step 3: Wire it in** — edit `apps/mobile/src/hooks/useBoot.ts`

Add the import beside the analytics import:

```ts
import { initGa4 } from '@/lib/ga4';
```

Add the call immediately after the existing `initAnalytics();` line (~line 48):

```ts
initAnalytics();
initGa4();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/hooks/useBoot.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/useBoot.ts apps/mobile/src/hooks/useBoot.test.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): initialize GA4 at boot beside PostHog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Native dependencies + Expo config

Install the Firebase Analytics SDK and its Expo config plugin so the app actually links GA4. This task has no unit test — its deliverable is a resolvable config and (ultimately) a clean native build.

**Files:**

- Modify: `apps/mobile/package.json` (deps)
- Modify: `apps/mobile/app.config.ts` (plugins array)

- [ ] **Step 1: Install the dependencies**

Run from the repo root:

```bash
cd apps/mobile
pnpm add @react-native-firebase/app @react-native-firebase/analytics
pnpm add -D expo-build-properties
```

Expected: three packages added to `apps/mobile/package.json`.

- [ ] **Step 2: Register the config plugins** — edit `apps/mobile/app.config.ts`

In the `plugins` array, add `@react-native-firebase/app` and an `expo-build-properties` entry that sets iOS static frameworks (React Native Firebase's iOS requirement — same static-linkage class of issue already handled by `plugins/withGoogleSignInPods`). Add near the other plugins (order relative to `expo-router` does not matter; place after `expo-dev-client`):

```ts
    '@react-native-firebase/app',
    [
      'expo-build-properties',
      {
        ios: {
          // React Native Firebase requires static frameworks on iOS. This
          // interacts with the Google Sign-In pod fix; verify a clean
          // `pod install` after adding (see Task 4 Step 4).
          useFrameworks: 'static',
        },
      },
    ],
```

- [ ] **Step 3: Verify config resolves**

Run: `cd apps/mobile && pnpm exec tsc --noEmit`
Expected: no errors (the Firebase types now resolve). Also run the full suite once more: `pnpm exec jest` → all PASS (global mock covers the native module).

- [ ] **Step 4: Verify the native config generates (best-effort, non-CI)**

Run: `cd apps/mobile && npx expo prebuild --platform ios --no-install`
Expected: prebuild completes and the generated `ios/Podfile` reflects static frameworks. If pod integration must be fully confirmed, run a `preview` EAS build later (Task 8) — a clean EAS build is the real gate for the pod graph. Do NOT commit the generated `ios/`/`android/` folders if the project builds them on CI; discard them:

```bash
git checkout -- . 2>/dev/null; git clean -fd ios android 2>/dev/null || true
```

(If the repo already commits native folders, follow that existing convention instead.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app.config.ts pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(mobile): add Firebase Analytics SDK + Expo config for GA4

@react-native-firebase/app + /analytics, with expo-build-properties setting iOS
static frameworks (RN Firebase requirement). Reuses the existing
google-services.json / GoogleService-Info.plist already on EAS.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: iOS App Tracking Transparency + SKAdNetwork

Add the ATT prompt (iOS only) and the SKAdNetwork identifiers so iOS ad attribution works.

**Files:**

- Modify: `apps/mobile/package.json` (add `expo-tracking-transparency`)
- Create: `apps/mobile/src/lib/tracking.ts`
- Create: `apps/mobile/src/lib/tracking.test.ts`
- Modify: `apps/mobile/app.config.ts` (plugin + `ios.infoPlist.SKAdNetworkItems`)
- Modify: `apps/mobile/app/(tabs)/home.tsx` (request ATT on first Home landing)

**Interfaces:**

- Produces: `export async function requestTrackingPermission(): Promise<void>` in `tracking.ts`.

- [ ] **Step 1: Install the dependency**

```bash
cd apps/mobile
pnpm add expo-tracking-transparency
```

- [ ] **Step 2: Add the global jest mock** — append to `apps/mobile/jest.setup.js`

```js
// expo-tracking-transparency has no native impl under jest.
jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  requestTrackingPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));
```

- [ ] **Step 3: Write the failing test** — `apps/mobile/src/lib/tracking.test.ts`

```ts
import * as ATT from 'expo-tracking-transparency';
import { Platform } from 'react-native';

import { requestTrackingPermission } from './tracking';

const getPerms = ATT.getTrackingPermissionsAsync as jest.Mock;
const requestPerms = ATT.requestTrackingPermissionsAsync as jest.Mock;

describe('requestTrackingPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests only when status is undetermined', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'undetermined' });
    await requestTrackingPermission();
    expect(requestPerms).toHaveBeenCalledTimes(1);
  });

  it('does not re-ask once already decided', async () => {
    Platform.OS = 'ios';
    getPerms.mockResolvedValueOnce({ status: 'denied' });
    await requestTrackingPermission();
    expect(requestPerms).not.toHaveBeenCalled();
  });

  it('is a no-op on Android', async () => {
    Platform.OS = 'android';
    await requestTrackingPermission();
    expect(getPerms).not.toHaveBeenCalled();
    expect(requestPerms).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd apps/mobile && pnpm exec jest src/lib/tracking.test.ts`
Expected: FAIL — `Cannot find module './tracking'`.

- [ ] **Step 5: Implement** — `apps/mobile/src/lib/tracking.ts`

```ts
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * The iOS App Tracking Transparency ask (spec §7).
 *
 * iOS only — Android has no ATT. Asks at most once: if the OS has already
 * recorded a decision (granted/denied/restricted) we never re-prompt. A denial
 * is fine — GA4 still works with reduced, non-IDFA attribution and no feature
 * breaks. Deliberately dependency-light so the "ask once" rule is testable
 * without a device.
 */
export async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const { status } = await getTrackingPermissionsAsync();
  if (status !== 'undetermined') return;

  await requestTrackingPermissionsAsync();
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/mobile && pnpm exec jest src/lib/tracking.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Request ATT on first Home landing** — edit `apps/mobile/app/(tabs)/home.tsx`

Add the import near the other lib imports:

```ts
import { requestTrackingPermission } from '@/lib/tracking';
```

Add a one-shot effect near the existing first-landing permission `useEffect` (the block that calls `shouldAskPermission`). Add a SEPARATE effect so the two asks stay independent:

```ts
// iOS ad-attribution consent (spec §7). Asked once, on the first Home landing
// after the Letter/paywall — never mid-onboarding. No-op on Android and after
// any prior decision.
useEffect(() => {
  void requestTrackingPermission();
}, []);
```

- [ ] **Step 8: Add the ATT usage string + SKAdNetwork IDs** — edit `apps/mobile/app.config.ts`

In `ios.infoPlist`, add the tracking description and the SKAdNetwork items (Google's network id is `cstr6suwn9.skadnetwork`; add ad partners you run campaigns with later):

```ts
    infoPlist: {
      UIBackgroundModes: ['audio'],
      NSUserTrackingUsageDescription:
        'Aura uses this to measure which ads led people here, so we can reach the right people. It never accesses your personal content.',
      SKAdNetworkItems: [{ SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' }],
    },
```

Also register the plugin in the `plugins` array:

```ts
    'expo-tracking-transparency',
```

- [ ] **Step 9: Run the full suite + typecheck**

Run: `cd apps/mobile && pnpm exec jest && pnpm exec tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
git add apps/mobile/package.json apps/mobile/pnpm-lock.yaml apps/mobile/jest.setup.js \
  apps/mobile/src/lib/tracking.ts apps/mobile/src/lib/tracking.test.ts \
  apps/mobile/app.config.ts "apps/mobile/app/(tabs)/home.tsx"
git commit -m "$(cat <<'EOF'
feat(mobile): iOS App Tracking Transparency + SKAdNetwork for GA4 attribution

Ask ATT once on first Home landing (iOS only, no-op on Android and after any
prior decision); add NSUserTrackingUsageDescription and the Google SKAdNetwork
id. A denial is fine — GA4 still works without IDFA.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Privacy-policy disclosure

Add a Google Analytics / Google Ads line to the public privacy policy. Store submission of a build including GA4 is blocked without it (spec §6).

**Files:**

- Modify: `apps/backend/src/legal/legal.content.ts`
- Modify: `apps/backend/src/legal/legal.controller.spec.ts` (if it exists; otherwise the existing legal test — locate it)

- [ ] **Step 1: Locate the privacy content and any test**

Run: `cd apps/backend && grep -rn "privacy" src/legal/ && ls src/legal/*.spec.ts 2>/dev/null`
Expected: shows `legal.content.ts` structure and whether a spec exists.

- [ ] **Step 2: Write/extend the failing test**

If a legal spec exists, add an assertion that the privacy text mentions Google Analytics. If none exists, create `apps/backend/src/legal/legal.content.spec.ts`:

```ts
import { PRIVACY_CONTENT } from './legal.content';

describe('privacy content', () => {
  it('discloses Google Analytics / Ads measurement', () => {
    const text = JSON.stringify(PRIVACY_CONTENT).toLowerCase();
    expect(text).toContain('google analytics');
  });
});
```

Note to implementer: check the actual exported symbol name in `legal.content.ts` (it may not be `PRIVACY_CONTENT`) and use the real one.

- [ ] **Step 3: Run to verify it fails**

Run: `cd apps/backend && pnpm exec jest legal`
Expected: FAIL — no "google analytics" in the content.

- [ ] **Step 4: Add the disclosure** — edit `apps/backend/src/legal/legal.content.ts`

Add a sentence to the privacy policy's data-collection/third-parties section, matching the file's existing structure and tone:

```
We use Google Analytics for Firebase and Google Ads to measure how people find Aura (for example, which ad led to an install) and to understand aggregate usage. This shares app and device identifiers with Google. It never includes the personal content you share with Aura — your name, your struggles, your words. You can limit ad tracking in your device settings.
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd apps/backend && pnpm exec jest legal`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/legal/
git commit -m "$(cat <<'EOF'
docs(backend): disclose Google Analytics/Ads measurement in the privacy policy

Required before shipping a build with GA4 (spec §6). Structural identifiers only;
never the personal content the app collects.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Console setup runbook

A documentation-only deliverable: exact console steps to make GA4 report conversions to Google Ads.

**Files:**

- Create: `docs/setup/ga4-ads-conversion-setup.md`

- [ ] **Step 1: Write the runbook** — `docs/setup/ga4-ads-conversion-setup.md`

Include these sections with concrete detail:

1. **Enable GA4 in the Firebase project** `aura-ca0d1` for both the Android app (`com.aura.manifestdaily`) and the iOS app (`com.aura.manifestdaily`) — Firebase Console → Project settings → Integrations → Google Analytics.
2. **Confirm events arrive** — build a `preview` app, open it, and check Firebase Console → Analytics → DebugView (enable debug mode: Android `adb shell setprop debug.firebase.analytics.app com.aura.manifestdaily`; iOS add `-FIRDebugEnabled` launch arg). Expect `first_open`, `onboarding_completed`, `purchase`.
3. **Mark Key events** — GA4 Admin → Events → toggle `onboarding_completed` and `purchase` as Key events (conversions).
4. **Link Google Ads** — GA4 Admin → Product links → Google Ads links → link the Ads account; then in Google Ads → Goals → Conversions → import the two GA4 key events.
5. **iOS attribution note** — SKAdNetwork + ATT already in the app; confirm the App Store privacy questionnaire declares "Data used to track you".
6. **Deferred: GTM** — a GTM container can be added later via Firebase → GTM with no app code change; and `trial_started` can be forwarded server-side via the GA4 Measurement Protocol (separate spec).

- [ ] **Step 2: Commit**

```bash
git add docs/setup/ga4-ads-conversion-setup.md
git commit -m "$(cat <<'EOF'
docs: GA4 → Google Ads conversion setup runbook

Console steps to enable GA4, verify via DebugView, mark key events, and link
Google Ads. Notes the deferred GTM/Measurement-Protocol follow-ups.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Verification build (manual gate)

Prove the pod graph links and events actually reach GA4 on a device. Not a code change — a real build + DebugView check.

- [ ] **Step 1: Build a preview app**

Run: `cd apps/mobile && eas build --platform android --profile preview` (and/or `--platform ios`).
Expected: build succeeds. iOS is the real test of the static-frameworks / pod graph (Task 4 risk).

- [ ] **Step 2: Verify events in DebugView**

Install the build, enable Firebase debug mode (see runbook), complete onboarding and a sandbox purchase, and confirm `first_open`, `onboarding_completed`, and `purchase` appear in Firebase DebugView.

- [ ] **Step 3: Confirm Ads import**

In Google Ads, confirm the imported conversions register (may take up to 24h for first data).

- [ ] **Step 4: No commit** — this task produces evidence, not code. Record the outcome in the PR / task notes.

---

## Self-Review

**Spec coverage:**

- §3 event mapping → Tasks 1–2 (allowlist, `purchase` mapping, `app_first_open` excluded). ✓
- §4 client changes (SDK, `ga4.ts`, fan-out, config plugin, build-properties) → Tasks 1, 2, 4. ✓
- §6 privacy (no params, autocollection trim via not enabling screen views, privacy-policy line) → Tasks 2 (name-only), 6 (policy). ✓
- §7 iOS ATT + SKAdNetwork → Task 5. ✓
- §8 env gating → Task 1. ✓
- §9 backend `trial_started` follow-up → noted as deferred in Task 7 runbook (not implemented, by design). ✓
- §10 console runbook → Task 7. ✓
- §11 testing (allowlist, no-op-when-disabled, no-params) → Tasks 1, 2. ✓
- §13 rollout order → Tasks 1→8 follow it. ✓

**Placeholder scan:** Task 3 Step 1 and Task 6 Step 2 intentionally ask the implementer to reuse the file's existing test harness / confirm the real exported symbol name rather than invent scaffolding — this is guidance to match existing code, with the real assertion shown. No `TBD`/`add error handling`/vague steps remain.

**Type consistency:** `initGa4()`, `logGa4Event(name)`, `isGa4Enabled()`, `requestTrackingPermission()` are used with the same signatures everywhere they appear (ga4.test, analytics fan-out, useBoot, home.tsx). `GA4_EVENT_NAMES` maps `onboarding_completed`→`onboarding_completed` and `purchase_completed`→`purchase` consistently between Task 2's implementation and its test.
