# Paywall A/B Testing (RevenueCat Experiments) — Plan

Test **price / trial / offering** variants of the paywall using RevenueCat
Experiments. RevenueCat assigns each new user to a variant server-side and serves
it as `offerings.current`; the app already reads `.current`, so almost no app code
changes. Results (conversion, trials, realized revenue) are read in RevenueCat.

> Scope: this is the **price/offering** test. To A/B the paywall's *layout or copy*
> (not price), use the PostHog path in the last section instead — the two are
> independent and can run at the same time.

---

## How it works (read once)

- An **Experiment** in RevenueCat pairs a **Control** Offering with one **Variant**
  Offering and a traffic split.
- Every **new** user who fetches offerings during the experiment is randomly
  bucketed. RevenueCat returns that bucket's Offering as `offerings.current`.
- Existing subscribers are excluded automatically.
- The app change is: **keep using `offerings.current`** (we already do in
  `loadPlans()`), and make sure both Offerings expose our product IDs.
- Attribution lives in RevenueCat; PostHog exposure is optional (last step of Part B).

---

## Prerequisites

1. Base RevenueCat setup done (`docs/setup/revenuecat-setup.md`): entitlement
   `premium`, products created, one **current** Offering that resolves in-app.
2. Store products at **Ready to Submit** (App Store Connect) / **Active** (Play).
3. A production build carrying the RevenueCat keys (already wired in
   `apps/mobile/eas.json`).

---

## Part A — Configure in RevenueCat

### 1. Create the variant Offering
1. RevenueCat dashboard → **Product catalog** → **Offerings** → **+ New**.
2. Identifier: e.g. `paywall_variant_b` (Control stays your existing `default`).
3. Add a **Package** per plan you are testing (annual / monthly / weekly).
4. Attach the **products** each package should show. This is where the variant
   differs — a different price tier, a longer trial, or a different plan mix.

### 2. Confirm the products carry the right identifiers
1. Each package's product identifier must match `PRODUCT_IDS` in
   `packages/shared/src/contracts/subscriptions.ts`
   (`aura_premium_annual` / `_monthly` / `_weekly`).
2. Google Play reports `productId:basePlanId`; Apple reports the bare `productId`.
   Both are already handled in `loadPlans()` (`purchases.ts`) — no action, just
   don't rename products.

### 3. Create the Experiment
1. RevenueCat dashboard → **Experiments** → **+ New Experiment**.
2. **Control** = your current live Offering (the one marked current today).
3. **Treatment / Variant** = `paywall_variant_b`.
4. Traffic split: start **50 / 50**.
5. Name it for what it tests, e.g. `annual-price-3999-vs-2999`.

### 4. Pick the metric and start
1. Primary metric: **Conversion to paid** (RevenueCat default). Watch trial
   starts and realized LTV too.
2. **Start** the experiment.
3. From now on, new users are bucketed automatically; no app deploy needed.

---

## Part B — App side (mostly verification)

### 1. Confirm we read the current offering (already true)
- `apps/mobile/src/features/paywall/purchases.ts` → `loadPlans()` calls
  `Purchases.getOfferings()` and uses `offerings.current`. That is exactly what
  RevenueCat overrides per variant. **No change required.**

### 2. Confirm identity is bound (already true)
- `configurePurchases()` calls `Purchases.configure({ appUserID: userId })` with
  the Supabase user id, and `analytics.identify(userId)` uses the same id. One
  identity spans RevenueCat + PostHog, so experiment results line up.

### 3. Confirm the funnel events fire (already true)
- `paywall_viewed`, `purchase_completed`, and `trial_started` are emitted from
  `app/paywall.tsx`. RevenueCat also emits `trial_started`/`purchase` server-side
  via its webhook as the authority.

### 4. (Optional) Mirror the RevenueCat variant into PostHog
Only if you want the split visible in PostHog funnels too:
1. Read the assigned offering id from `offerings.current.identifier` after
   `getOfferings()` in `loadPlans()`.
2. `analytics.register({ paywall_offering: <identifier> })` so it rides on
   subsequent events as a super property.
3. Keep it an enum-safe string — no free text (privacy rule in `analytics.ts`).

---

## Part C — Read results & ship the winner

1. RevenueCat dashboard → **Experiments** → your experiment → conversion,
   trials, and realized revenue per variant with significance.
2. Let it run until significance (typically ≥ 1–2 weeks and enough installs).
3. Ship the winner: set the winning Offering as **current** (Offerings → ⋯ →
   Make current), then **stop** the experiment.
4. No app release needed — `offerings.current` now serves the winner to everyone.

---

## Alternative — test paywall LAYOUT/COPY (PostHog, not price)

The experiment registry already reserves a key for this:

- `apps/mobile/src/features/experiments/keys.ts` →
  `paywallLayout: 'paywall-layout'` (control = shipped, test = alternate).

To run it:
1. In `app/paywall.tsx` (or `PaywallScreen.tsx`), read the variant:
   `const layout = useVariant(EXPERIMENTS.paywallLayout, 'control', ['control','test'])`
   and branch the presentation on it. `control` MUST be the current UI byte-for-byte.
2. The flag already belongs in `infra/posthog/provision.mjs` FLAGS — confirm it is
   there; run `node infra/posthog/provision.mjs` to create it (0% rollout = everyone
   on control).
3. In PostHog, create an Experiment on `paywall-layout` with goal metric
   `purchase_completed`, then ramp traffic (see `infra/posthog/RUNBOOK.md`).
4. Exposure (`$feature_flag_called`) fires automatically from `useVariant`.

Use RevenueCat Experiments for **price/offering**, PostHog for **UI/copy**. They do
not conflict.
