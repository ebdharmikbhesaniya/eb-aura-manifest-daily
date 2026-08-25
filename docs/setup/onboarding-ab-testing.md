# Onboarding Extra-Screen A/B Testing — Plan

Test **adding an extra screen** to the onboarding flow: half of new users see it,
half don't, and you compare `onboarding_completed`.

> **Read this first — where the test actually lives.**
> An in-app onboarding screen is A/B tested **in the app via PostHog** (Part A/B
> below), using the experiment system already in the codebase. It is **not**
> configured in the App Store or Play Store. The stores have a *separate* kind of
> experiment — the **pre-install store listing** (screenshots, preview, icon) —
> which does not touch onboarding. That store-side option is Part C, kept separate
> so the two aren't confused.

The app already A/B tests onboarding screens this way — `onboarding-dream-home`
and `onboarding-commit-beat` each toggle one screen. This plan follows the same
pattern for a **new** screen (control = not shown, since a new screen is not part
of today's shipped flow).

---

## Part A — Build the screen and wire the experiment (app)

### 1. Create the screen
1. Add the route file: `apps/mobile/app/(onboarding)/sXX-<name>.tsx`
   (route files are named by id; copy an existing simple one like
   `s13-commit.tsx`).
2. Add any component under `apps/mobile/src/features/onboarding/`.

### 2. Register the screen id (shared types)
1. `packages/shared/src/events/types.ts` → add `'sXX-<name>'` to the
   `OnboardingScreenId` union.

### 3. Add it to the flow
1. `apps/mobile/src/features/onboarding/flow.ts`:
   - Insert `'sXX-<name>'` at the desired position in `SCREEN_ORDER`.
   - Add it to `ANSWER_TYPE` (use `'none'` if it carries no answer).
   - If skippable, add to `SKIPPABLE`.

### 4. Register the experiment key
1. `apps/mobile/src/features/experiments/keys.ts` → add to `EXPERIMENTS`:
   ```ts
   /** Whether the new sXX screen shows in onboarding. control = NOT shown (shipped). */
   onboardingSxx: 'onboarding-sxx',
   ```
2. Variants for a **new** screen: `control` = hidden (today's behaviour),
   `shown` = the screen appears. (This is the inverse of the existing hide-a-
   screen experiments, because the screen is new.)

### 5. Gate the screen behind the flag
1. `apps/mobile/src/features/onboarding/useHiddenScreens.ts`:
   ```ts
   const sxx = useVariant(EXPERIMENTS.onboardingSxx, 'control', ['control', 'shown']);
   // ...inside the memo:
   if (sxx !== 'shown') hidden.add('sXX-<name>');
   ```
2. This is all the navigation needs: `nextScreen`/`previousScreen` and the
   progress counter already skip hidden screens in both directions.

### 6. Provision the flag
1. `infra/posthog/provision.mjs` → add to `FLAGS`:
   ```js
   {
     key: 'onboarding-sxx',
     name: 'Onboarding · new sXX screen',
     variants: [
       ['control', 'hidden (shipped)'],
       ['shown', 'extra screen shown'],
     ],
   },
   ```
2. Run it (creates the flag ACTIVE at 0% → everyone on control):
   ```
   POSTHOG_HOST=https://us.i.posthog.com POSTHOG_PROJECT_ID=<id> \
   POSTHOG_PERSONAL_API_KEY=phx_xxx node infra/posthog/provision.mjs
   ```

### 7. Tests
1. `apps/mobile/src/features/onboarding/flow.test.ts` — assert `nextScreen`
   skips `sXX` when it is in the hidden set.
2. Add a `useHiddenScreens` case: `shown` → screen absent from hidden;
   `control` → present.

### 8. Analytics (already wired)
- Exposure: reading the flag makes PostHog emit `$feature_flag_called`
  automatically.
- Per-screen: `onboarding_screen_viewed { screen_id }` already fires.
- Outcome: `onboarding_completed { duration_s, questions_answered }` — the metric
  the experiment moves.

---

## Part B — Run the experiment (PostHog)

1. PostHog → **Experiments** → **New** → feature flag `onboarding-sxx`.
2. Goal metric: **`onboarding_completed`** (secondary: `purchase_completed`, to
   confirm a longer onboarding doesn't hurt conversion downstream).
3. Ramp traffic to 50/50 (see `infra/posthog/RUNBOOK.md` for the ramp steps).
4. `control` stays byte-for-byte today's flow, so a flag outage always lands on
   the shipped experience.
5. Read significance in PostHog; ship the winner by setting the flag to 100% of
   the winning variant (or fold the screen into `SCREEN_ORDER` permanently and
   retire the flag).

---

## Part C — Store-side experiments (OPTIONAL, different thing)

Use this **only** to test the **pre-install store page**, not onboarding. It
changes what a shopper sees before downloading; it cannot add an in-app screen.

### Apple — Product Page Optimization (App Store Connect)
1. App Store Connect → your app → **Product Page Optimization** → **+**.
2. Create up to **3 treatments** varying screenshots / app preview / icon.
3. Set traffic %, submit the treatments for review.
4. Start the test; read impression → install conversion per treatment.
5. Apply the winner to the default product page.

### Google — Store Listing Experiments (Play Console)
1. Play Console → your app → **Grow → Store presence → Store listing experiments**.
2. **Create experiment** → choose default vs. variant assets (screenshots,
   description, icon), audience, and split.
3. Start; read store-listing conversion per variant.
4. Apply the winner.

> These affect the install funnel, not the app. Keep them independent from the
> PostHog onboarding test above — you can run both, but they answer different
> questions.
