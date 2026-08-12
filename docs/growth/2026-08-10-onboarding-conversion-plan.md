# Onboarding & Conversion — Implementation + Testing Plan

**Date:** 2026-08-10
**Source:** Glow teardown §10, §13, §14 + Aura inventory.
**Thesis (Glow):** onboarding is where 80–90% of conversions are decided. Three separate dials: **onboarding completion**, **trial-start rate**, **trial→paid**. Move them one A/B at a time.

> **Values guardrail:** every item below is written to fit Aura's calm, honest, in-voice product doctrine. No streaks (doc 16), no guilt screens, no fake urgency (doc 01 §10). Adopt the _mechanism_, drop the _coercion_.

**Prereq for measuring any of this:** the PostHog experiment/feature-flag hook from the analytics plan. Ship that first so each change below is a real A/B, not a guess.

---

## Item 1 — Commitment beat before the paywall (in-voice)

**Why:** Glow's biggest single paywall-conversion lift was a "commit" screen right before the wall (pattern from Duolingo/Headway/RevenueCat). Committing to a goal boosts follow-through.

**Aura-fit design:** NOT a coercive fingerprint-hold. A single quiet Conversation beat after S12/before the Letter→paywall, in the future-self voice: _"When your letter arrives, will you let it in?"_ with one affirmative button ("I'm ready"). It reads as emotional preparation for the Letter, not a sales device. Optionally echo the user's name/goal from onboarding ("Ready, {name}?").

**Files:**

- Add a screen component `src/features/onboarding/screens/S13Commit.tsx` (mirror `S12Notifications.tsx` structure; no progress step, no answer).
- Register route `app/(onboarding)/s13-commit.tsx`; add `s13-commit` to `SCREEN_ORDER` in `src/features/onboarding/flow.ts` AFTER `s12-notifications` (ANSWER_TYPE `none`).
- Copy in `src/copy/onboarding.ts`.
- Gate behind a PostHog flag so it's an A/B from day one.

**Testing:**

- Unit: `flow.ts` — `nextScreen('s12-notifications') === 's13-commit'`; `s13-commit` not counted in `QUESTION_SCREENS`.
- Component test (like `screens.test.tsx`): renders copy, single CTA advances to `/(onboarding)/generating`.
- Analytics: fire `onboarding_screen_viewed {screen_id:'s13-commit'}`; add a `commitment_accepted` event (extend the catalog in `packages/shared/src/events/`).
- A/B metric: paywall `initial conversion` (variant with commit vs control). Ship to production only if it wins with ≥ the RC/PostHog sample threshold (~300 users / ~50 conversions per arm).

---

## Item 2 — First-Home activation: coach-marks + legible personalization

**Why:** Glow's trial→paid was ~0 until users **saw the value fast**. His fix: a post-onboarding tutorial + a first-session goal + a "For You" surface. Aura's value moment is the **Letter** (already free, already first), so the tutorial belongs on **first Home arrival**, not before the Letter.

**Aura-fit design:**

- **First-Home coach-marks** (one-time): 2–3 calm tooltips — the day's moment, how to play it, where the affirmation/gratitude live. Dismissible, shown once, stored in MMKV (mirror `paywallSeen`/`letterSeen` pattern).
- **Legible personalization** ("chosen for you today"): Aura already personalizes via Living Memory, but invisibly. Add a quiet line/label that names _why_ today's moment fits her ("shaped around {value}") so the personalization is felt. This is the honest version of Glow's "For You."

**Files:**

- `src/features/onboarding/FirstRunCoach.tsx` (overlay) + a `firstRunSeen` flag in `src/lib/storage.ts`.
- Mount on `app/(tabs)/home.tsx` when `!firstRunSeen && justArrivedFromOnboarding`.
- Personalization label: extend `HomeScreen`/`TodayMomentCard` + copy; source the "why" from the profile value already in Living Memory.

**Testing:**

- Coach shows exactly once (flag set on dismiss); never re-appears; never covers the Letter route.
- Snapshot/interaction test for the overlay; a11y labels present.
- Analytics: `firstrun_coach_shown` / `_completed`; measure **day-2 retention** and **trial→paid** vs control (flagged A/B).

---

## Item 3 — Notification opt-in framing (keep Aura's stance)

**Why:** Glow lifted opt-in with a pre-explainer + a post-decline screen. **Aura already has the pre-explainer** (S12 Card) and **deliberately refuses the guilt screen**.

**Aura-fit design (small, values-safe):**

- Keep S12's pre-permission explainer. Optionally **A/B the S12 copy** (benefit-led vs current) to lift opt-in without adding a screen.
- Do **not** add a "you're missing out" guilt screen. If testing a re-offer at all, use the existing `permissionGate.shouldShowDeniedHint` (quiet, ≤ weekly) — never modal, never guilt.

**Files:** `src/copy/onboarding.ts` (S12 copy variants behind a flag); no new screens.

**Testing:** A/B S12 copy on **notification-permission grant rate** (add a `notification_permission_result {granted}` event if not present). Confirm no regression to onboarding completion.

---

## Item 4 — Onboarding length A/B (measure before trimming)

**Why:** Glow's counter-intuitive result — removing 3 personal questions dropped conversion to ~0; the **"no-pact"** (one screen removed) variant won. Length is a real dial but **shorter is not automatically better**; segmentation questions carry conversion.

**Aura-fit design:** treat `SCREEN_ORDER` as the experiment surface. Variants: control; minus-one-low-value-screen; reordered (move the emotionally-heavy `s10-struggle` earlier/later); ask-one-more segmentation question. Assign variant via PostHog flag at onboarding start; the Conversation already emits per-screen events.

**Files:** a variant selector in `useConversation.ts` / `flow.ts` that returns a `SCREEN_ORDER` per flag; no per-screen rewrites.

**Testing:**

- Unit: each variant's `SCREEN_ORDER` is internally consistent (`nextScreen`/`previousScreen`/`QUESTION_SCREENS` still valid; skippable set still valid).
- A/B metrics: **onboarding completion** AND **onboarding→trial conversion** (both, per Glow — a variant can lift completion but kill conversion). Decide on conversion, not completion alone.
- Guard: never remove `s03-name` (required) or reorder `s01/s02` (tone-setting).

---

## Item 5 — Home-screen widget (retention + demo asset) — bigger bet

**Why:** Glow's widget was a core retention + acquisition-demo surface. Very on-brand for Aura (a daily affirmation / glowing Orb on the home screen).

**Design:** a small + medium widget showing today's affirmation (or a line from the moment) with the Orb; tap opens the app; refreshes on a schedule. Native via Expo config plugin (`@bacons/apple-targets` or a custom WidgetKit target on iOS; App Widget on Android). Read the affirmation from a shared app-group store the app writes on generation.

**Testing:** widget renders the latest affirmation; updates on schedule; tap deep-links into the app; offline shows last cached line; no PII leakage to the widget store. This is a native build — plan a dedicated spec (brainstorming → writing-plans) rather than folding into a JS PR.

---

## Sequencing

1. PostHog flags (analytics plan) — unblocks measurement.
2. Grace period + store trial config (monetization plan) — pure upside.
3. Item 1 (commit beat) and Item 3 (S12 copy A/B) — cheap, high-leverage, flagged.
4. Item 2 (first-Home activation) — retention.
5. Item 4 (length A/B) — once flags + funnel dashboards are trusted.
6. Item 5 (widget) — separate native spec.
