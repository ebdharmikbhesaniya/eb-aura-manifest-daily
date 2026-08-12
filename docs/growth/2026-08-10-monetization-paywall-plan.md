# Monetization & Paywall — Implementation + Testing Plan

**Date:** 2026-08-10
**Source:** Glow teardown §4, §13, §14 + Aura inventory.
**Thesis:** trial→paid (~31% for Glow) is set by the **trial length**, the **value seen before the wall**, and the **paywall wording**. Aura already has the hard gate + trial-timeline (Glow's endpoint); this plan is the tuning around it.

---

## Item 1 — Billing grace period (do this first)

**Why:** Glow recovered **~10% of revenue** by enabling a 3-day billing grace period. A failed charge (expired card, etc.) retries for 3 days while the user keeps premium. **Zero code, no values conflict, pure upside.**

**Action (store config, not code):**

- App Store Connect → your subscription group → **Billing Grace Period → 3 days**.
- Google Play Console → Monetize → Subscriptions → **grace period** (+ account hold).
- RevenueCat already models the state — `BILLING_ISSUE` is a handled webhook event type in `packages/shared/src/contracts/subscriptions.ts`.

**Testing:**

- Sandbox: force a renewal failure; confirm the `premium` entitlement stays active through the grace window and `useEntitlement().premium` stays true (so the hard gate doesn't wall a grace-period user).
- Confirm the Settings subscription screen shows the billing-issue state honestly (copy `paywallCopy.subscription.billingIssue` already exists) without walling access.
- Verify a genuinely-lapsed user (post-grace) is correctly re-gated on next launch (entitlement → false → boot routes to paywall).

---

## Item 2 — Store config to actually show the trial timeline

**Why:** Aura's `PaywallScreen` only renders the trial timeline when the store offering carries a real intro offer (`introPrice.price === 0`). Until configured, users get the honest fallback (no timeline) or the escape hatch.

**Action:**

- Create the **7-day free-trial introductory offer** on the **annual** product in **both** App Store Connect and Google Play.
- Confirm RevenueCat's `current` offering includes the annual package with the intro; `trialDaysFromIntro` (in `purchases.ts`) then yields 7 → timeline shows "Today / In 5 days / In 7 days".

**Testing:**

- On-device with a license-tester: the timeline renders with the real days; CTA reads "Start your free trial"; a completed trial purchase → Home; relaunch → Home.
- `purchases.test.ts` already covers offering parsing; add a case asserting `trialDaysFromIntro` maps WEEK/DAY units → days.

---

## Item 3 — Paywall A/B: single trial-timeline vs multi-step sequence

**Why:** Aura shows the three trial beats on **one** screen (the timeline). Glow converged on **separate one-info screens** (trial → reminder → what-you-get). Both are "one info per moment"; which converts better is empirical.

**Design:** behind a RevenueCat experiment (or PostHog flag), route the hard-gate presentation to either:

- **A (control):** current single `PaywallScreen` trial-timeline.
- **B:** a 3-step swipeable sequence (each beat full-screen) ending on the plan + CTA. Reuse `TrialTimeline` beats as individual steps; keep Restore/legal on the final step.

**Files:** a `paywallVariant` selector in `app/paywall.tsx` (hard mode only; soft/settings stays single). New `PaywallSteps.tsx` for variant B. Do **not** fork the entitlement/gate logic — only the presentation.

**Testing:**

- Both variants: no ✕ in hard mode, back swallowed, escape hatch intact, purchase/restore → Home, legal + Restore present, renewal disclosure shown on the final step.
- A/B metric: **initial conversion rate** (trial start). Ship the winner; keep ≥50 conversions/arm before deciding (RC guidance).

---

## Item 4 — Trial length & price experiments

**Why:** Glow used a 3-day trial; Aura uses 7. Trial length trades trial-start rate against trial→paid. Price and plan mix (annual vs monthly vs weekly hero) also move revenue-per-install.

**Design:** these are **store + RevenueCat** experiments, not app code:

- Trial length: **3-day vs 7-day** intro offers (RevenueCat experiment / offering variants).
- Price: RevenueCat experiment on the annual price point per market (store handles localization already — no per-country table in code needed).
- Hero plan: annual-with-trial (current) vs weekly-with-trial as the pre-selected hero.

**Testing:** RevenueCat experiments dashboard; primary metric **realized revenue per paywall view** (not just trial starts — a longer trial can inflate starts and depress paid). Let each run to significance.

---

## Item 5 — Premium value beyond "unlimited" (raises trial→paid)

**Why:** Glow lifted trial→paid by adding **selectable backgrounds/themes** and a **voice** — premium value users can _see_. Aura's gated set today (`manifest_anything`, `refine`, `favorites`, `collections`, `share_export`) is functional; consider one **cosmetic** and one **voice** upsell, on-brand.

**Candidates (must pass Ember & Bone taste):**

- **Premium paper/background set** for the affirmation/moment surface (tasteful, not garish). New gated feature key; surface a picker for premium users.
- **Premium vendor voice** for the affirmation "Hear it read" (today device-TTS via `useSpeech.ts`) — a warmer ElevenLabs read as a premium reading.

**Testing:** free users see the locked affordance → `LockedFeatureSheet` → paywall (soft). Premium users get the feature. Measure trial→paid before/after with the addition flagged.

---

## Sequencing

1. **Grace period** (Item 1) + **store trial config** (Item 2) — immediate, no code.
2. **RevenueCat experiments** wired (analytics plan) → run **trial length** (Item 4) and **paywall A/B** (Item 3).
3. **Premium value** additions (Item 5) once the funnel above is trusted.
