# Onboarding Hard Paywall — Design

**Date:** 2026-08-10
**Status:** Approved (design)
**Surface:** The session-1 funnel (boot router + `/paywall` route) and every relaunch. The Letter, onboarding, and the free-tier feature map are otherwise untouched.

## Goal

Turn the post-Letter paywall from a **soft** offer (dismiss → free tier → Home) into a
**hard gate**: after onboarding and the first Letter, the app is unreachable until the
user holds the `premium` entitlement (an active subscription, trial included). This
applies to **everyone** on their next launch — new sign-ups and existing free-tier users
alike — and is enforced at boot so a force-quit/relaunch cannot bypass it.

The subscription leads with a **7-day free trial** (an introductory offer configured in
the stores), which the user can cancel within the 7 days.

## What changes conceptually

Today entry is decided by a **local "seen" flag** (`paywallSeen`): once dismissed, boot
sends her to Home forever (`routeGate.ts`). That is the soft tier. A real gate cannot be
a local flag — it must be decided by **live entitlement**. So the gate moves from
`paywallSeen` to `premium`, read from RevenueCat.

New session-1 funnel (the only change is the last hop):

```
sign-in → onboarding → Letter (free, the wow) → [premium ? Home : HARD paywall]
```

This **reverses** three deliberate prior decisions, by explicit founder request
(2026-08-10):

- The free tier as "review-score insurance / the Finch lesson" (`gating.ts`) — there is
  now no free entry. The `GATED_FEATURES` map stays (harmless; everyone inside is premium)
  but no longer defines the product's floor.
- "Dismissal is a real outcome → free tier" (`paywall.tsx`, `routeGate.ts`).
- "Shown once, never trapped, no second offer" for the _first_ presentation. (The
  Settings / locked-feature presentation keeps all of that — see Two modes.)

## Global Constraints

- **Gate on live entitlement, never a local flag.** Home is reachable only when RevenueCat
  reports `premium` active (trial counts as active), OR the wall is not enforceable (below).
- **Enforced at boot.** The boot router decides entry every launch, so relaunch/force-quit
  cannot skip the wall.
- **Retroactive.** All non-subscribers are gated on next launch, including existing
  free-tier users with data already in the app. (Their data is untouched — `lapsedKeepsData`
  copy already promises this — it is simply behind the wall until they subscribe.)
- **Never brick / never fail review — the escape hatch is mandatory.** When there is **no
  purchasable offering** — a build with no RevenueCat key (`!isConfigured()`), or a
  configured build whose offering resolves empty (RC outage / offline reviewer) — the gate
  **lets her in**. Preserves the existing principle in `purchases.ts`: "a monetization
  outage must degrade to free, never to a broken launch."
- **Restore is always available on the wall** (Apple requirement + returning users).
- **The Letter stays free and plays first.** The wow is spent before the ask (product 08).
- **No change to onboarding, generation, the Letter, or feature-level gating.**

## Enforceability, and the boot race (the load-bearing detail)

`useEntitlement` **cannot** be used in `BootGate`. Its effect runs once on mount and reads
`isConfigured()` then; at boot RC is **not yet configured** (it is configured partway
through `useBoot`, which `await`s `configurePurchases` before `setReady`). So `useEntitlement`
mounted at boot would latch to "not configured → free" and never re-check.

Fix: capture the entitlement snapshot **inside `useBoot`**, immediately after
`configurePurchases`, and store it in `appState`. `useBoot` already sequences
`configurePurchases → setReady`, so the snapshot is correct by construction, and the
existing `CustomerInfo` update listener still keeps live surfaces (Home gating) fresh via
`useEntitlement` (which mounts later, after RC is configured).

- `purchasesConfigured = isConfigured()` after configure — this is `paywallEnforceable`.
- `premium`: if configured, `hasPremium(await Purchases.getCustomerInfo())`, else `false`.
  A `getCustomerInfo` failure resolves to `false` (fail toward "ask"); RC returns its
  cached `CustomerInfo` when offline, so an existing subscriber offline stays premium, and
  a true edge (never-cached + offline) can still Restore.

## Components / Files

### Mobile — state

- `apps/mobile/src/stores/appState.ts` — add `premium: boolean` and
  `purchasesConfigured: boolean` (both default `false`). `setReady` takes them as arguments
  and sets them alongside `status: 'ready'`. `setUnauthenticated` / `setFailed` / `reset`
  clear them back to `false`.
- `apps/mobile/src/hooks/useBoot.ts` — after `await configurePurchases(userId)`, read
  `configured = isConfigured()` and `premium = configured ? hasPremium(await
Purchases.getCustomerInfo()) : false` (guarded), then
  `setReady(userId, premium, configured)`.

### Mobile — the gate

- `apps/mobile/src/lib/routeGate.ts` — `BootState` **drops** `paywallSeen`, **adds**
  `premium: boolean` and `paywallEnforceable: boolean`. New tail:

  ```ts
  if (!state.claimed) return '/(auth)/sign-in';
  if (!state.profile.onboarding_completed_at) return '/(onboarding)/resume';
  if (state.hasLetter && !state.letterSeen) return '/letter';
  if (state.paywallEnforceable && !state.premium) return '/paywall';
  return '/(tabs)/home';
  ```

  Note the wall now fires even when `hasLetter` is false (e.g. a failed first generation):
  an onboarded non-premium user with an enforceable wall is gated regardless. Only
  `!paywallEnforceable` or `premium` reaches Home.

- `apps/mobile/src/components/BootGate.tsx` — read `premium` and `purchasesConfigured` from
  `appState`; stop importing/passing `hasSeenPaywall`. Pass `premium` and
  `paywallEnforceable: purchasesConfigured` into `resolveBootRoute`. No new async wait is
  needed: `status === 'ready'` already implies the snapshot is set.

### Mobile — the Letter hand-off

- `apps/mobile/app/letter.tsx` — replace
  `router.replace(hasSeenPaywall() ? '/(tabs)/home' : '/paywall')` with a **premium** check
  read from `appState` (race-free snapshot): `router.replace(premium ? '/(tabs)/home' :
'/paywall')`. Drop the `hasSeenPaywall` import.

### Mobile — the wall: two modes

The `/paywall` route serves two presentations, distinguished as today by the `from` param:

- **Hard mode** — no `from` (arrived from boot or the Letter). The gate.
- **Soft mode** — `from=settings` (opened deliberately from Settings or a locked-feature
  sheet). Unchanged: the ✕ appears after 2s and pops back.

- `apps/mobile/src/features/paywall/PaywallScreen.tsx` — make `onDismiss` **optional**.
  Render the delayed ✕ **only when `onDismiss` is provided**. When absent (hard mode) the
  headline takes the top slot (the existing `marginTop` branch already handles the
  no-dismiss layout). Also: CTA reads the trial when the selected plan has one — use
  `selected.hasTrial ? paywallCopy.plans.ctaTrial : paywallCopy.plans.cta`.

- `apps/mobile/app/paywall.tsx`:
  - `const hard = from !== 'settings';`
  - **Hard mode passes no `onDismiss`** (so no ✕, no free-tier exit). Soft mode passes
    `onDismissCover` exactly as today.
  - **Escape hatch (hard mode):** keep the existing "offering resolved empty" effect, but in
    hard mode it routes to Home directly (not via a `leaveToFreeTier` that implies a tier):
    `if (plansResolved && plans.length === 0 && hard) router.replace('/(tabs)/home')`. This
    is the ONLY non-purchase way forward in hard mode. Soft mode keeps its "back / plans
    unavailable" copy.
  - **Premium safety net (hard mode):** read `useEntitlement()`; when `premium` becomes true
    and `hard`, `router.replace('/(tabs)/home')`. Covers a premium user boot-routed here,
    and restore. (RC is configured by the time this route mounts, so `useEntitlement` is
    safe here — the race only bites at boot.)
  - **Android back (hard mode):** swallow the hardware back press (return `true`) so back
    cannot drop out mid-decision; the route is already `gestureEnabled: false`. Soft mode
    keeps default back.
  - Purchase success and Restore keep their existing flow (analytics → `ClaimSheet` →
    `router.replace('/(tabs)/home')`). `markPaywallSeen()` may stay (now vestigial, harmless).

- `apps/mobile/src/lib/routeGate.ts` no longer consumes `paywallSeen`; `paywallSeen.ts`
  stays for the (harmless) purchase-path call and is not deleted in this work.

### Mobile — copy

- `apps/mobile/src/copy/paywall.ts` — add `plans.ctaTrial: 'Start your free trial'`. Keep
  `trialNote` ("Includes a 7-day free trial.") and `renewalNote` ("Renews automatically.
  Cancel anytime in two taps.") — together with the plan price these satisfy Apple's
  auto-renew disclosure (3.1.2) at the point of purchase.

## The 7-day trial (store configuration, not code)

The trial is an **introductory offer** on the subscription product, configured in **App
Store Connect** and **Google Play Console**, surfaced by RevenueCat as `introPrice`
(`price === 0`). Code only _displays_ what the stores expose (`hasTrial`,
`introPrice`). Prerequisite for the trial-first wall to actually show a trial:

- Add a **7-day free-trial introductory offer** to the **hero (annual)** subscription
  product on **both** stores. (Annual is pre-selected on the wall; the fallback table's
  `hasTrial` flag is display-only and cannot be charged.)

## Store-review prerequisites (must be true for the production build)

- `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` **must be set**. The footer hides a
  link it lacks, and Apple **rejects** auto-renewable-subscription apps without functional
  Terms (EULA) + Privacy links. A hard wall with no legal links is a guaranteed rejection.
- The escape hatch above keeps a reviewer on a flaky network (or a build whose IAP is
  momentarily unreachable) from being bricked at the wall.
- Restore Purchase stays on the footer (already present).

## Behaviour

- **New user, first run:** onboarding → generating → Letter (free) → hard paywall. Only a
  completed purchase or a successful restore opens Home.
- **Existing free-tier user, next launch:** boot snapshot `premium=false`,
  `purchasesConfigured=true` → after any unheard Letter, the hard paywall. Their moments,
  gratitude, and saved affirmations are intact behind it.
- **Subscriber (or trial), any launch:** boot snapshot `premium=true` → straight to Home.
  No wall flash (the snapshot is resolved before `status==='ready'`).
- **Dev build / no RC key / RC outage:** `purchasesConfigured=false` (or offering empty) →
  gate is not enforceable → Home. The app is never bricked in development or review.
- **Settings / locked feature:** `/paywall?from=settings` is unchanged — dismissible ✕
  pops back.

## Testing

- **`routeGate.test.ts`:** rewrite the paywall block for the entitlement gate:
  premium → Home; `!premium && paywallEnforceable` (letter seen) → `/paywall`;
  `!premium && !paywallEnforceable` → Home; still never before the Letter; still never
  during onboarding; still behind sign-in. Update the `state()` factory: drop `paywallSeen`,
  add `premium` / `paywallEnforceable`.
- **`appState`:** `setReady(userId, premium, configured)` sets all three; `reset` /
  `setUnauthenticated` clear `premium` + `purchasesConfigured`.
- **`PaywallScreen.test.tsx`:** no ✕ rendered when `onDismiss` is omitted (hard mode); ✕
  rendered (after delay) when provided (soft mode); CTA shows `ctaTrial` when the selected
  plan `hasTrial`, else `cta`.
- **`paywall.tsx` (route):** hard mode passes no `onDismiss`; hard-mode empty offering →
  `router.replace('/(tabs)/home')`; hard-mode `premium` → Home; soft mode
  (`from=settings`) still dismissible and shows the plans-unavailable copy.
- **On-device:** finish onboarding on a build with a real offering → wall with no ✕, back
  does not exit; purchase (or trial) → Home; kill + relaunch while unsubscribed → wall again
  (no bypass); relaunch as subscriber → straight to Home; a build with no RC key → straight
  to Home (no wall).

## Out of scope

- Any change to onboarding, generation, or the Letter.
- Removing the `GATED_FEATURES` map or the `paywallSeen` module (left in place, inert).
- A win-back / re-engagement wall for lapsed subscribers (separate concern).
- Server-side entitlement enforcement changes (the backend mirror already exists via the RC
  webhook; this work is client-gating only).
