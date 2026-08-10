# Onboarding Hard Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After onboarding and the first Letter, gate the app behind an active `premium` subscription (7-day trial included), enforced at boot so relaunch cannot bypass it, retroactive to existing free users, with a mandatory escape hatch when no purchasable offering exists.

**Architecture:** Move the entry gate from the local `paywallSeen` flag to live RevenueCat entitlement. Capture a `premium` + `purchasesConfigured` snapshot inside `useBoot` (right after `configurePurchases`, which boot already awaits before `setReady`) so `BootGate` routes without the `useEntitlement`-at-boot race. `resolveBootRoute` gains `premium` + `paywallEnforceable` and drops `paywallSeen`. The `/paywall` route gains a "hard mode" (no dismiss, no free exit; only purchase / restore / escape-hatch move forward) while the Settings/locked-feature presentation (`?from=settings`) stays soft.

**Tech Stack:** React Native, Expo Router, Zustand (`appState`), RevenueCat (`react-native-purchases`), Jest + React Native Testing Library.

## Global Constraints

- Gate on live entitlement (`premium`), never a local flag. Trial counts as premium.
- The gate is only enforced when a purchasable offering can exist: `paywallEnforceable = isConfigured()`. When not enforceable (no RC key) OR the offering resolves empty, the user reaches Home — never bricked.
- Retroactive: the boot-router change gates all non-subscribers on next launch; no data migration.
- The Letter stays free and plays first (product 08). Onboarding, generation, and the `GATED_FEATURES` feature map are untouched.
- `markPaywallSeen()` calls stay — `paywallSeen` still feeds the Home notification-permission fallback (`permissionGate.shouldAskPermission`). Only its use in the _entry_ gate is removed.
- New `setReady` params are optional (existing `setReady('user-1')` call sites must keep compiling).
- Restore stays on the wall footer. Soft mode (`?from=settings`) behaviour is unchanged.
- Commands run from `apps/mobile` unless noted. Test runner: `pnpm test -- <path>`; typecheck: `pnpm typecheck`.

---

### Task 1: Boot entitlement snapshot in `appState` + `useBoot`

Capture `premium` / `purchasesConfigured` at boot, in the correct order, and expose them on the store. `setReady`'s new params are optional so nothing else breaks. This task couples the store change with its only producer (`useBoot`) so the build stays green.

**Files:**

- Modify: `apps/mobile/src/stores/appState.ts`
- Modify: `apps/mobile/src/hooks/useBoot.ts`
- Test: `apps/mobile/src/stores/appState.test.ts`

**Interfaces:**

- Produces: `useAppState` state `premium: boolean`, `purchasesConfigured: boolean`; `setReady(userId: string, premium?: boolean, purchasesConfigured?: boolean)`.

- [ ] **Step 1: Write the failing test** — append to `apps/mobile/src/stores/appState.test.ts`:

```ts
it('records the entitlement snapshot passed to setReady', () => {
  useAppState.getState().setReady('user-1', true, true);
  expect(useAppState.getState().premium).toBe(true);
  expect(useAppState.getState().purchasesConfigured).toBe(true);
});

it('defaults the snapshot to free when setReady is called with just an id', () => {
  useAppState.getState().setReady('user-1');
  expect(useAppState.getState().premium).toBe(false);
  expect(useAppState.getState().purchasesConfigured).toBe(false);
});

it('clears the entitlement snapshot on reset', () => {
  useAppState.getState().setReady('user-1', true, true);
  useAppState.getState().reset();
  expect(useAppState.getState().premium).toBe(false);
  expect(useAppState.getState().purchasesConfigured).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/stores/appState.test.ts`
Expected: FAIL — `premium` / `purchasesConfigured` undefined; `setReady` takes one arg.

- [ ] **Step 3: Update `appState.ts`**

In the `AppState` interface, add the two fields and widen `setReady`:

```ts
status: BootStatus;
userId: string | null;
/** RevenueCat premium snapshot, captured at boot (trial counts as premium). */
premium: boolean;
/** Whether RevenueCat has a key on this build — i.e. the wall is enforceable. */
purchasesConfigured: boolean;
```

```ts
  setReady: (userId: string, premium?: boolean, purchasesConfigured?: boolean) => void;
```

In `create`, set the defaults and thread the params; clear them everywhere status leaves `ready`:

```ts
export const useAppState = create<AppState>((set) => ({
  status: 'booting',
  userId: null,
  premium: false,
  purchasesConfigured: false,
  bootNonce: 0,
  setReady: (userId, premium = false, purchasesConfigured = false) =>
    set({ status: 'ready', userId, premium, purchasesConfigured }),
  setUnauthenticated: () =>
    set({ status: 'unauthenticated', userId: null, premium: false, purchasesConfigured: false }),
  setFailed: () =>
    set({ status: 'failed', userId: null, premium: false, purchasesConfigured: false }),
  reset: () =>
    set((state) => ({
      status: 'booting',
      userId: null,
      premium: false,
      purchasesConfigured: false,
      bootNonce: state.bootNonce + 1,
    })),
}));
```

- [ ] **Step 4: Update `useBoot.ts`** — capture the snapshot after `configurePurchases`.

Add imports:

```ts
import Purchases from 'react-native-purchases';
import { configurePurchases, hasPremium, isConfigured } from '@/features/paywall/purchases';
```

(the existing `import { configurePurchases } from '@/features/paywall/purchases';` line is replaced by the combined import above.)

Replace the `configurePurchases` call + `setReady(userId)` region:

```ts
// Bound to her Supabase id, so a purchase made anonymously still belongs
// to her after she claims. Never fatal: a build with no RevenueCat key
// simply has everyone on the free tier (12 §2).
await configurePurchases(userId).catch(() => undefined);

// Entitlement snapshot for the hard gate. Read here, after configure and
// before setReady, so BootGate can route without the useEntitlement-at-
// boot race (RC is not configured when that hook first mounts). A build
// with no key stays unenforceable → everyone reaches Home (never bricked).
const purchasesConfigured = isConfigured();
const premium = purchasesConfigured
  ? await Purchases.getCustomerInfo()
      .then(hasPremium)
      .catch(() => false)
  : false;

sweepAudioCache();

emitAppOpen('cold');
setReady(userId, premium, purchasesConfigured);
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm test -- src/stores/appState.test.ts` → PASS
Run: `pnpm typecheck` → clean

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/stores/appState.ts apps/mobile/src/hooks/useBoot.ts apps/mobile/src/stores/appState.test.ts
git commit -m "feat(paywall): capture premium entitlement snapshot at boot"
```

---

### Task 2: Move the entry gate to entitlement (`routeGate.ts`)

Swap `paywallSeen` for `premium` + `paywallEnforceable` in the pure router.

**Files:**

- Modify: `apps/mobile/src/lib/routeGate.ts`
- Test: `apps/mobile/src/lib/routeGate.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `BootState` now has `premium: boolean` and `paywallEnforceable: boolean`, and no longer has `paywallSeen`. `resolveBootRoute(state: BootState): BootRoute` unchanged signature/return type.

- [ ] **Step 1: Rewrite the test's factory + paywall block.** In `apps/mobile/src/lib/routeGate.test.ts`, change the `state` factory (drop `paywallSeen`, add the two fields — default to the enforceable, non-premium wall so the existing "signed-in → home" cases must now assert premium):

```ts
const state = (overrides: Partial<BootState> = {}): BootState => ({
  claimed: true,
  profile: { onboarding_completed_at: '2026-07-17T10:00:00Z' },
  hasLetter: false,
  letterSeen: false,
  premium: true,
  paywallEnforceable: true,
  ...overrides,
});
```

Replace the whole `describe('the paywall gate (12 §3)', ...)` block with:

```ts
describe('the hard paywall gate (2026-08-10)', () => {
  const heardTheLetter = { hasLetter: true, letterSeen: true };

  it('walls a non-premium user once she has heard the letter', () => {
    expect(
      resolveBootRoute(state({ ...heardTheLetter, premium: false, paywallEnforceable: true })),
    ).toBe('/paywall');
  });

  it('lets a premium user straight to Home', () => {
    expect(
      resolveBootRoute(state({ ...heardTheLetter, premium: true, paywallEnforceable: true })),
    ).toBe('/(tabs)/home');
  });

  it('walls even when no letter exists — the gate is entitlement, not a letter', () => {
    expect(
      resolveBootRoute(state({ hasLetter: false, premium: false, paywallEnforceable: true })),
    ).toBe('/paywall');
  });

  it('never walls when the offering is not enforceable (no RC key) — never bricked', () => {
    expect(
      resolveBootRoute(state({ ...heardTheLetter, premium: false, paywallEnforceable: false })),
    ).toBe('/(tabs)/home');
  });

  it('never shows the paywall BEFORE the letter — the wow is spent first', () => {
    expect(
      resolveBootRoute(
        state({ hasLetter: true, letterSeen: false, premium: false, paywallEnforceable: true }),
      ),
    ).toBe('/letter');
  });

  it('never shows the paywall during onboarding (checklist #4)', () => {
    expect(
      resolveBootRoute(
        state({
          profile: { onboarding_completed_at: null },
          premium: false,
          paywallEnforceable: true,
        }),
      ),
    ).toBe('/(onboarding)/resume');
  });
});
```

Also fix the two earlier cases that assumed a signed-in user goes Home by default — they now need `premium: true` (already the factory default, so they pass unchanged) — and the `'sends a user with no letter yet to Home'` case must set `premium: true` (factory default covers it). Verify no remaining `paywallSeen` reference stays in the file.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/lib/routeGate.test.ts`
Expected: FAIL — `BootState` has no `premium`/`paywallEnforceable`; router still reads `paywallSeen`.

- [ ] **Step 3: Update `routeGate.ts`.** In `BootState`, remove the `paywallSeen` field and its doc, and add:

```ts
/** Does RevenueCat report an active premium entitlement (trial counts)? */
premium: boolean;
/**
 * Is the wall enforceable — i.e. a purchasable offering can exist on this
 * build (`isConfigured()`)? When false (no RC key), the gate must not lock
 * anyone out: a monetization outage degrades to Home, never a broken launch.
 */
paywallEnforceable: boolean;
```

Replace the paywall line in `resolveBootRoute`:

```ts
if (state.hasLetter && !state.letterSeen) return '/letter';
// The hard gate (2026-08-10): entry now requires an active subscription, not a
// dismissed-once flag. Only an unenforceable wall (no offering) or premium
// reaches Home. The letter still plays first — the wow is spent before the ask.
if (state.paywallEnforceable && !state.premium) return '/paywall';
return '/(tabs)/home';
```

Update the function's doc comment: the funnel is now `sign-in → onboarding → letter → subscription → home`, and the paywall gate is entitlement-based and enforced every launch (drop the "shown once / second offer banned" note, which described the soft tier).

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/lib/routeGate.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/routeGate.ts apps/mobile/src/lib/routeGate.test.ts
git commit -m "feat(paywall): gate boot entry on premium, not paywallSeen"
```

---

### Task 3: Wire `BootGate` to the entitlement snapshot

Feed `appState`'s `premium` / `purchasesConfigured` into `resolveBootRoute`; stop reading `hasSeenPaywall` for entry.

**Files:**

- Modify: `apps/mobile/src/components/BootGate.tsx`

**Interfaces:**

- Consumes: `useAppState` `premium` / `purchasesConfigured` (Task 1); `resolveBootRoute` `premium` / `paywallEnforceable` (Task 2).

- [ ] **Step 1: Update the selectors.** Below the existing `userId` selector add:

```ts
const premium = useAppState((s) => s.premium);
const purchasesConfigured = useAppState((s) => s.purchasesConfigured);
```

- [ ] **Step 2: Remove the `hasSeenPaywall` import** (line 10) and update the `resolveBootRoute` call:

```ts
router.replace(
  resolveBootRoute({
    claimed,
    profile,
    hasLetter: Boolean(letterQuery.data),
    letterSeen: hasSeenLetter(),
    premium,
    paywallEnforceable: purchasesConfigured,
  }),
);
```

Add `premium` and `purchasesConfigured` to the effect's dependency array.

- [ ] **Step 3: Typecheck + run the boot/route suites**

Run: `pnpm typecheck` → clean (proves no dangling `hasSeenPaywall`/`paywallSeen` reference here)
Run: `pnpm test -- src/components/BootGate` (if a suite exists) → PASS, else skip.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/BootGate.tsx
git commit -m "feat(paywall): route boot entry through the entitlement snapshot"
```

---

### Task 4: Letter hand-off routes on premium

After the Letter, go to Home only if premium; otherwise the wall. Use the race-free `appState` snapshot.

**Files:**

- Modify: `apps/mobile/app/letter.tsx`

**Interfaces:**

- Consumes: `useAppState` `premium` (Task 1).

- [ ] **Step 1: Swap the import.** Remove `import { hasSeenPaywall } from '@/features/paywall/paywallSeen';` (line 10). `useAppState` is already imported.

- [ ] **Step 2: Read premium and use it in `leave`.** Add near the other `useAppState` selector:

```ts
const premium = useAppState((s) => s.premium);
```

Replace the route line inside `leave`:

```ts
// The hard gate (2026-08-10): after the letter, Home is reachable only with an
// active subscription. A non-premium user meets the wall; it inherits this
// gradient, so it reads as the letter's next page. Nothing in between.
router.replace(premium ? '/(tabs)/home' : '/paywall');
```

Add `premium` to `leave`'s `useCallback` dependency array.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck` → clean

- [ ] **Step 4: Run any letter route test**

Run: `pnpm test -- app/letter` (if present) → PASS, else skip.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/letter.tsx
git commit -m "feat(paywall): send the post-Letter hand-off to the wall unless premium"
```

---

### Task 5: Trial CTA copy

Add the trial-first CTA string surfaced when the selected plan has a free trial.

**Files:**

- Modify: `apps/mobile/src/copy/paywall.ts`

**Interfaces:**

- Produces: `paywallCopy.plans.ctaTrial: string`.

- [ ] **Step 1: Add the string.** In the `plans` object, next to `cta: 'Continue',` add:

```ts
    /** Trial-first CTA — shown when the selected plan carries a free trial. */
    ctaTrial: 'Start your free trial',
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck` → clean

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/copy/paywall.ts
git commit -m "feat(paywall): add trial-first CTA copy"
```

---

### Task 6: `PaywallScreen` — optional dismiss + trial CTA

Make the ✕ opt-in (absent in hard mode) and show the trial CTA when the selected plan has a trial.

**Files:**

- Modify: `apps/mobile/src/features/paywall/PaywallScreen.tsx`
- Test: `apps/mobile/src/features/paywall/PaywallScreen.test.tsx`

**Interfaces:**

- Consumes: `paywallCopy.plans.ctaTrial` (Task 5).
- Produces: `PaywallScreenProps.onDismiss?` is now optional. When omitted, no ✕ renders.

- [ ] **Step 1: Write the failing tests.** Add to `apps/mobile/src/features/paywall/PaywallScreen.test.tsx` (follow the file's existing render helper / plan fixtures; a plan fixture needs `hasTrial`). Two cases:

```ts
it('renders no dismiss control when onDismiss is omitted (hard mode)', () => {
  const { queryByTestId } = renderPaywall({ onDismiss: undefined });
  act(() => {
    jest.advanceTimersByTime(DISMISS_DELAY_MS + 100);
  });
  expect(queryByTestId('paywall-dismiss')).toBeNull();
});

it('shows the trial CTA when the selected plan has a trial', () => {
  const { getByTestId } = renderPaywall({
    plans: [{ ...annualPlan, hasTrial: true }],
  });
  expect(getByTestId('paywall-continue')).toHaveTextContent(paywallCopy.plans.ctaTrial);
});
```

If the existing suite has no `renderPaywall` helper or `DISMISS_DELAY_MS`/`act`/timer imports, add them: import `DISMISS_DELAY_MS` from `./PaywallScreen`, `paywallCopy` from `@/copy/paywall`, and use `jest.useFakeTimers()` in the existing setup (match how the current test drives the 2s delay — it already asserts the ✕ appears, so the timer harness is present).

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- src/features/paywall/PaywallScreen.test.tsx`
Expected: FAIL — ✕ still renders without `onDismiss`; CTA still reads `cta`.

- [ ] **Step 3: Make `onDismiss` optional.** Change the prop type (line 29):

```ts
  /** Omit to render the wall with no dismiss (hard-gate mode). */
  onDismiss?: () => void;
```

- [ ] **Step 4: Gate the ✕ on `onDismiss`.** Change the dismiss block condition (line 92) from `{dismissable && (` to `{dismissable && onDismiss && (`. Inside the `onPress`, the `onDismiss()` call is now guaranteed defined by that guard — leave it as `onDismiss()`.

- [ ] **Step 5: Fix the headline top-margin** so it only collapses when the ✕ actually shows (line ~118): change `marginTop: dismissable ? 0 : spacing.xl,` to `marginTop: dismissable && onDismiss ? 0 : spacing.xl,`.

- [ ] **Step 6: Trial CTA.** Change the `PillButton` title (line 164) from `title={paywallCopy.plans.cta}` to:

```tsx
              title={selected.hasTrial ? paywallCopy.plans.ctaTrial : paywallCopy.plans.cta}
```

(`selected` is already `plans.find(...) ?? plans[0]` and the `PillButton` renders only inside `selected && (...)`, so it is defined here.)

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm test -- src/features/paywall/PaywallScreen.test.tsx` → PASS
Run: `pnpm typecheck` → clean

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/features/paywall/PaywallScreen.tsx apps/mobile/src/features/paywall/PaywallScreen.test.tsx
git commit -m "feat(paywall): optional dismiss + trial-first CTA on the wall"
```

---

### Task 7: `/paywall` route — hard mode

Make the route enforce the gate: no dismiss in hard mode, escape hatch to Home when the offering is empty, auto-advance to Home once premium, and swallow Android back. Soft mode (`?from=settings`) is unchanged.

**Files:**

- Modify: `apps/mobile/app/paywall.tsx`

**Interfaces:**

- Consumes: `PaywallScreen` optional `onDismiss` (Task 6); `useEntitlement` (existing).

- [ ] **Step 1: Add imports.** Add `BackHandler` to the `react-native` import; add `useEntitlement`:

```ts
import { BackHandler, Linking, Text, View } from 'react-native';
```

```ts
import { useEntitlement } from '@/features/paywall/useEntitlement';
```

- [ ] **Step 2: Derive `hard` and read premium.** After `const askedForPlans = from === 'settings';` add:

```ts
// Hard mode is the gate: arrived from boot or the Letter, with no way out but a
// completed purchase / restore (or the escape hatch when there is no offering).
const hard = !askedForPlans;
const { premium } = useEntitlement();
```

- [ ] **Step 3: Premium safety net.** Add an effect so a premium user routed here (or one who just restored) advances to Home. Place it near the other effects:

```ts
// A subscriber must never be held at the wall — covers a premium user the boot
// gate sent here before her snapshot resolved, and the restore path. RC is
// configured by the time this route mounts, so useEntitlement is reliable here
// (the boot race that forbids it in BootGate does not apply this late).
useEffect(() => {
  if (hard && premium) router.replace('/(tabs)/home');
}, [hard, premium, router]);
```

- [ ] **Step 4: Swallow Android back in hard mode.** Add:

```ts
// No back out of the gate. The cover is already gestureEnabled:false; this
// stops Android's hardware back from dropping her out mid-decision. Relaunch
// would re-gate her anyway, so nothing is bypassed — this is just tidier.
useEffect(() => {
  if (!hard) return;
  const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
  return () => sub.remove();
}, [hard]);
```

- [ ] **Step 5: Update the empty-offering effect to be the hard-mode escape hatch.** The existing effect (line ~109) is `if (plansResolved && plans.length === 0 && !askedForPlans) leaveToFreeTier();`. It already routes to Home via `leaveToFreeTier` (which sets `paywallSeen` and replaces Home) — exactly the escape hatch. Keep the behaviour; only refresh the wording so it is not read as a "free tier" choice. Rename `leaveToFreeTier` to `leaveToHome` throughout this file and update its doc comment to: "No purchasable offering (offline, no RC key, RC outage). The wall cannot be enforced, so she must not be stranded — mark it seen (for the Home notification prompt) and let her in. This is the ONLY non-purchase way past the hard gate." The `markPaywallSeen()` inside stays (feeds `permissionGate`).

- [ ] **Step 6: Pass `onDismiss` only in soft mode.** In the `<PaywallScreen .../>` props, replace `onDismiss={onDismissCover}` with:

```tsx
            {...(hard ? {} : { onDismiss: onDismissCover })}
```

`onDismissCover` keeps its current definition; in hard mode it is simply never wired, so no ✕ renders. (The `leaveToHome` branch inside `onDismissCover` is now only reachable in soft mode with no offering, which the effect already handles — leaving it is harmless.)

- [ ] **Step 7: Typecheck + run route test if present**

Run: `pnpm typecheck` → clean
Run: `pnpm test -- app/paywall` (if a suite exists) → PASS, else skip.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/paywall.tsx
git commit -m "feat(paywall): enforce the hard gate on the /paywall route"
```

---

### Task 8: Full-suite guard + store-config note

Prove nothing regressed and record the store prerequisites the code depends on.

**Files:**

- Create: `docs/superpowers/plans/2026-08-10-onboarding-hard-paywall-STORE-SETUP.md`

- [ ] **Step 1: Run the full mobile suite + lint + typecheck**

Run (from `apps/mobile`): `pnpm test` → all suites PASS
Run: `pnpm lint` → clean
Run: `pnpm typecheck` → clean

Fix any fallout in the files this plan touched (do not broaden scope).

- [ ] **Step 2: Write the store-setup note** with the human prerequisites the wall cannot satisfy itself:

```markdown
# Hard paywall — store & env prerequisites (must be done before shipping)

1. **7-day free-trial intro offer** on the HERO (annual) subscription product,
   in BOTH App Store Connect and Google Play Console. RevenueCat surfaces it as
   `introPrice.price === 0`; the app then shows "Start your free trial". Without
   it, the wall shows the paid CTA only.
2. **EXPO_PUBLIC_TERMS_URL and EXPO_PUBLIC_PRIVACY_URL must be set** for the
   production build. The footer hides a link it lacks, and Apple rejects
   auto-renewable-subscription apps with no functional Terms (EULA) + Privacy
   links. A hard wall with no legal links is a guaranteed rejection.
3. Confirm the RevenueCat iOS/Android keys are present in the production build
   (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`). With no key the gate is
   not enforceable (by design — never bricked) and everyone reaches Home; a
   production build MUST carry the keys or the wall does nothing.
4. QA on device: finish onboarding on a build with a real offering → wall with
   no ✕, back does not exit → purchase/trial → Home; kill + relaunch while
   unsubscribed → wall again; relaunch as subscriber → straight to Home.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-08-10-onboarding-hard-paywall-STORE-SETUP.md
git commit -m "docs(paywall): record hard-paywall store + env prerequisites"
```

---

## Self-Review

- **Spec coverage:** boot snapshot (Task 1), entitlement gate + escape hatch (Task 2), BootGate wiring (Task 3), Letter hand-off (Task 4), trial copy (Task 5), optional-dismiss + trial CTA (Task 6), hard-mode route incl. escape hatch / premium net / back (Task 7), store prerequisites + full-suite guard (Task 8). All spec sections map to a task.
- **Type consistency:** `setReady(userId, premium?, purchasesConfigured?)` defined in Task 1 and called in Task 1 (`useBoot`); `BootState.premium` / `paywallEnforceable` defined in Task 2 and consumed in Task 3; `onDismiss?` made optional in Task 6 and relied on in Task 7; `paywallCopy.plans.ctaTrial` defined in Task 5 and used in Task 6.
- **No placeholders:** every code step shows the code; every run step names the command and expected result.
