# Analytics & A/B Testing — Implementation + Testing Plan

**Date:** 2026-08-10
**Source:** Glow teardown §5, §10, §14 + Aura inventory.
**Thesis:** Glow's entire method was **only build what a metric asks for, and let A/B tests pick**. Aura already has clean event tracking and a full onboarding funnel; the gap is the **experimentation layer** (PostHog experiments / RevenueCat experiments / ASC PPO). This is the highest-leverage infra add — it unblocks every other plan.

---

## What Aura already has (don't rebuild)

- **PostHog** (`src/lib/analytics.ts`), catalog-only, autocapture OFF, privacy-clean (no free-text, enforced by types in `packages/shared/src/events/`).
- **GA4 fan-out** (`src/lib/ga4.ts`) for ad attribution on a whitelist (`onboarding_completed`, `purchase`).
- **Full onboarding funnel:** `onboarding_started` → `onboarding_screen_viewed {screen_id}` (per screen) → `onboarding_answer_submitted` → `onboarding_completed {duration_s, questions_answered}`.
- **Paywall events:** `paywall_viewed {surface}`, `paywall_dismissed`, `purchase_completed`.
- **Sentry** for errors.

## The gap

- **No experiment / feature-flag hooks** (no `getVariant`, no flags). → can't A/B in-app.
- **No RevenueCat experiments** → can't A/B paywall/price/trial.
- **No ASC Product Page Optimization** → can't A/B icon/screenshots.
- **Missing a couple of funnel events** for the levers we want to move (see below).

---

## Item 1 — PostHog feature-flag / experiment hook (the keystone)

**Design:** a thin, typed wrapper so screens read a variant without touching PostHog directly and stay testable.

- Add `getFeatureFlag(key)` / `getExperimentVariant(key)` to `src/lib/analytics.ts` (PostHog RN supports flags). Bootstrap flags at boot (in `useBoot`, after identify) so variants are stable for the session.
- Expose a tiny hook `useVariant('onboarding_flow')` returning `'control' | 'variantB' | …` with a **safe default = control** when PostHog is unconfigured/offline (mirror the entitlement "degrade safely" rule — a flag outage must never break a screen).
- Register the experiment keys in a typed enum in `packages/shared` so keys can't drift.

**Testing:**

- Unit: `useVariant` returns `control` when PostHog not configured/errored; returns the assigned variant otherwise; is stable within a session.
- Every experiment must have a **holdout/control** and the control path must be the current production behavior byte-for-byte.
- Guard: flags must not gate anything **safety- or entitlement-related** — presentation only.

## Item 2 — Fill the funnel event gaps

Add (typed, catalog-only) events needed to measure the onboarding/monetization plans:

- `trial_started` (RevenueCat trial purchase) — distinct from `purchase_completed`, so trial-start vs paid is measurable in one place. Source it from the purchase outcome / RC customer-info listener.
- `notification_permission_result { granted: boolean }` — to measure S12 opt-in A/B.
- `commitment_accepted` — for the commit-beat A/B.
- `firstrun_coach_shown` / `firstrun_coach_completed` — first-Home activation.
- `paywall_variant_assigned { variant }` / `onboarding_variant_assigned { variant }` — to join experiment arm ↔ outcome.

**Testing:** extend `packages/shared/src/events/types.ts` + `client.ts`; the type system rejects free-text; add a test that each new event has no PII fields. Verify each fires exactly once at the right moment.

## Item 3 — Core dashboards / metrics (the numbers to watch)

Build these in PostHog (Glow's key metrics, adapted):

- **Onboarding funnel** — completion by screen (already have per-screen events); watch the biggest drop-off screen.
- **Acquisition funnel** — `download → onboarding_started → onboarding_completed → paywall_viewed → trial_started → purchase_completed`.
- **The three headline rates:** download→trial, trial→paid, **revenue per download** (Glow's north-star RPD ≈ $1.64).
- **Retention** — day-1 / day-2 / day-7 return (Glow: "most important"; day-2 was his early red flag). **Note:** measure retention via app-open/ritual-completion events, **NOT a streak** (streaks banned, doc 16).
- **Per-experiment views** — arm vs outcome for each running test.

**Testing:** dashboards reconcile with raw event counts; RPD cross-checks against RevenueCat revenue for the same window.

## Item 4 — RevenueCat experiments (paywall/price/trial)

**Design:** use RevenueCat's Experiments tab (server-side offering/paywall variants) — no app deploy needed to change a variant. Primary metric per experiment: for paywall design → **initial conversion**; for trial length/price → **revenue per paywall view**. Keep ≥ ~50 conversions/arm before deciding.

**Testing:** confirm each variant's offering resolves in `loadPlans()` and the app renders it (both timeline and fallback); confirm the escape hatch still fires if a variant returns no purchasable package.

## Item 5 — App Store Connect Product Page Optimization

**Design (store-side):** A/B the **app icon** first (Glow: "can have a huge impact"), then screenshots order. Metric: install conversion on the product page.

**Testing:** run to significance; keep the winner; re-test after major keyword changes (recent-review ranking interaction).

---

## Guardrails (Aura values)

- Flags gate **presentation and copy only** — never entitlement, safety, QA, or the anti-dark-pattern guarantees.
- No experiment may introduce a banned pattern (streak, countdown, fake urgency/discount, guilt) even if it "wins" — those are out of the search space (doc 01 §10, doc 16).
- Analytics stays **catalog-only / no free-text / no PII**, enforced by the type system — new events included.

## Sequencing

1. **Item 1** (flag hook) + **Item 2** (event gaps) — the keystone; ship together.
2. **Item 3** dashboards — so decisions have a home.
3. **Item 4** RevenueCat experiments + **Item 5** ASC PPO — run in parallel with the onboarding A/Bs.
