# Onboarding Flow — Deep-Dive Analysis & Improvement Plan

**Date:** 2026-08-10
**Source:** The Glow case-study transcript (its onboarding recommendations) + a screen-by-screen inventory of Aura's current onboarding, verified against the code 2026-08-10.
**Scope:** Everything from the first launch through the paywall — the funnel that Glow proved decides **80–90% of all conversions**. Deeper and onboarding-specific vs. the sibling `2026-08-10-onboarding-conversion-plan.md`.

> **Glow's central claim, restated:** _"Spend ~90% of your time on the onboarding. More than 80% of conversions happen there. That's way more important than the app itself."_ Three separate dials live here — **onboarding completion**, **trial-start rate**, and **trial→paid** — and each is moved by a different change.

> **Values guardrail (reads on every item):** Aura's anti-dark-pattern doctrine (product 01 §10, product 16) is not negotiable by an A/B win. No streaks, no guilt, no fake urgency, no countdowns. We adopt Glow's _mechanisms_, never its coercion.

---

## Part 1 — Aura's current onboarding, screen by screen

The onboarding is a **"Conversation"** (`src/features/onboarding/`): one question per screen, a serif question, a quiet helper, a progress header on question screens, and a floating Continue. `SCREEN_ORDER` in `flow.ts` is the source of truth.

| #    | Screen                  | Asks / does                                    | Answer | Feeds                               |
| ---- | ----------------------- | ---------------------------------------------- | ------ | ----------------------------------- |
| 1    | `s01-welcome`           | Tone + **price honesty on screen 1** + Begin   | none   | analytics `onboarding_started`      |
| 2    | `s02-meet-aura`         | "I'm Aura" intro + the memory promise          | none   | —                                   |
| 3    | `s03-name`              | Her name (required, never skippable)           | text   | `profiles.name`, Living Memory      |
| 4    | `s04-self-description`  | "How would you describe yourself?" (skippable) | text   | `profiles.self_description`, Memory |
| 5    | `s05-work-feeling`      | How work feels (choice)                        | choice | `profiles.work_feeling`             |
| 6    | `s06-values`            | What matters most (pick ≤2)                    | multi  | `profiles.values`, Memory           |
| 7    | `s10-struggle`          | "What feels heaviest right now?" (skippable)   | text   | `profiles.struggle`, Memory         |
| 8    | `s11-arrival-time`      | When moments should arrive                     | time   | `profiles.arrival_time`             |
| 9    | `s12-why-notifications` | **NEW** — why the reminder matters             | none   | —                                   |
| 10   | `s12-notifications`     | The OS permission ask                          | none   | permission + push token             |
| (11) | `s12b-notifications`    | **NEW** — second chance if declined            | none   | permission                          |

Then: `generating` (the ritual) → **the Letter (the free wow)** → **hard paywall** → Home.

**What Aura already does well (Glow had to add these):**

- **Price honesty on the very first screen** (`s01Welcome.priceHonesty`) — Glow never did this; it's an anti-resentment win.
- **Progress header** (`ProgressHeader.tsx`) — Glow "completely forgot" it; Aura has the slim ember track + honest `step/total` counter, counting _questions_ not screens.
- **Full per-screen funnel analytics** — `onboarding_started`, `onboarding_screen_viewed {screen_id}`, `onboarding_answer_submitted {screen_id, answer_type, skipped, char_count_bucket}`, `onboarding_completed {duration_s, questions_answered}`. This is the screen-by-screen drop-off tracking Glow built by hand.
- **The wow before the ask** — the Letter is generated from her answers and played free _before_ the paywall. Glow's equivalent (a static quote) is far weaker; this is Aura's single biggest structural advantage.
- **Living Memory** — answers seed a personalization store (`seedMemoryForUser`) that shapes every generated moment.

**Retired, but not gone (2026-07-30):** `s07-dream-home`, `s08-dream-city`, `s09-people` were removed from `SCREEN_ORDER` — the conversation went from ~9 questions to 6. Crucially:

- `S07DreamHome.tsx` **still exists**, and its copy, `profiles.dream_home` column, `profileFieldFor` case, and `seedProfileFromDraft` read are **all still wired** → re-enabling dream-home is a **one-line `SCREEN_ORDER` change**.
- `s08-dream-city` / `s09-people` copy + columns remain, but their **screen components were deleted** → re-enabling needs a component rebuild.

---

## Part 2 — The transcript's onboarding recommendations

Enumerated from the Glow teardown, onboarding-specific:

1. **Onboarding is where the money is** — spend ~90% of effort here.
2. **Progress bar** — adding it lifted completion (Glow: 74% → 83% alongside the commitment beat).
3. **Ask MORE segmentation questions** — the counter-intuitive headline: the _"less personal"_ variant (3 personal questions removed) drove conversion to **~0**. Personalization questions are load-bearing, not friction.
4. **The "no-pact" A/B winner** — removing _one_ low-value screen won on both completion and conversion. Length is a real dial, but **shorter ≠ automatically better** — only data decides which screen.
5. **Commitment psychology** — a "commit to your goal" beat right before the paywall (Duolingo/Headway/RevenueCat pattern) materially lifted paywall conversion.
6. **One information per screen** — especially in the paywall sequence.
7. **Post-onboarding tutorial + a first-session goal** — so the user _uses_ the app in the first minute (fixed a trial→paid of ~0).
8. **"For You" recommendations** from onboarding answers — the value moment right after onboarding.
9. **Notification pre-permission explainer + post-decline screen** — protects the retention loop (~2/3 opt-in otherwise).
10. **A/B everything via PostHog experiments** — control / variants, decide on **conversion**, ~300 users/arm.
11. **Screen-by-screen drop-off** — know exactly which screen to cut or keep.

---

## Part 3 — Gap analysis (recommendation → Aura → action)

Legend: ✅ have · 🟡 partial · ❌ missing · ⛔ conflicts with values

| #   | Recommendation                          | Aura                                                | Action                                                                                                                                                                                                               |
| --- | --------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Onboarding-first mindset                | ✅ (the Letter-before-paywall funnel is well built) | Keep; instrument + A/B (below).                                                                                                                                                                                      |
| 2   | Progress bar                            | ✅ `ProgressHeader`                                 | None — already banked. Consider A/B on whether S1/S2 should also show a "0/6"-style hint (currently header starts at Q1).                                                                                            |
| 3   | **More segmentation questions**         | 🟡 **Retired 3 questions** in July; asks 6          | **Re-enable `s07-dream-home`** (one line) and **A/B** it; consider rebuilding dream-city/people. Glow's data says this is likely a conversion _gain_, and it deepens the Letter. **Highest-signal onboarding test.** |
| 4   | Length/order A/B ("no-pact")            | ❌ no A/B infra                                     | Build the flag hook, then A/B `SCREEN_ORDER` variants — decide on trial-start, not completion.                                                                                                                       |
| 5   | **Commitment beat before paywall**      | ❌                                                  | Add an in-voice commit screen (not a coercive hold). High expected lift on trial-start.                                                                                                                              |
| 6   | One info per screen                     | ✅ onboarding; 🟡 paywall (single rich timeline)    | A/B single trial-timeline vs a 3-step sequence (see monetization plan).                                                                                                                                              |
| 7   | **Tutorial + first-session goal**       | ❌                                                  | First-Home coach-marks + a "do one thing" goal. Fixes trial→paid, lifts day-2 retention.                                                                                                                             |
| 8   | **"For You" / legible personalization** | 🟡 personalization is _invisible_ (Living Memory)   | Make it legible: name _why_ today's moment fits her. Aura personalizes deeper than Glow — it just never shows it.                                                                                                    |
| 9   | Notification framing                    | ✅ **done** (why → ask → second chance)             | Ship complete; A/B the S12 copy later.                                                                                                                                                                               |
| 10  | A/B infra (PostHog experiments)         | ❌                                                  | **The keystone.** Nothing below is measurable without it.                                                                                                                                                            |
| 11  | Screen drop-off tracking                | ✅ per-screen events                                | Build the funnel dashboard; watch the biggest-drop screen.                                                                                                                                                           |

**The two biggest onboarding-specific opportunities Aura is currently missing:**

- **(A) It shortened the conversation** exactly when Glow's data says depth _converts_ — and the personalization those questions feed is Aura's core magic. Re-testing length/depth is the highest-signal move.
- **(B) There is no value moment engineered right after onboarding** (tutorial / For-You) — Glow's fix for a dead trial→paid.

---

## Part 4 — The improvement plan (prioritized, with testing)

**Prereq — the flag hook (from `2026-08-10-analytics-abtesting-plan.md`).** Ship the PostHog `useVariant` hook + the funnel events first; it degrades to `control` when unconfigured. Everything below is gated behind it so each change is a real A/B, not a guess.

### Item 1 — Re-enable the dream-home question (+ test depth) — _highest signal, tiny effort_

**Why:** Glow's data — removing personal questions cratered conversion. Aura retired 3. `s07-dream-home` is a **one-line** re-enable (component/copy/column/seed all present), and it directly enriches the Letter.

**Change:** add `'s07-dream-home'` back into `SCREEN_ORDER` (after `s06-values`, its original slot), behind a `useVariant('onboarding_depth')` flag: `control` = current 6-question flow; `variantB` = 7 with dream-home; (optional) `variantC` = rebuild + add dream-city/people for the full 9.

**Files:** `flow.ts` (variant-aware `SCREEN_ORDER`); `S07DreamHome.tsx` (exists); for variantC, rebuild `S08DreamCity`/`S09People` from git history (`git log --oneline -- '**/S08*'`).

**Testing:**

- Unit: each variant's `SCREEN_ORDER` stays internally consistent (`nextScreen`/`previousScreen`/`QUESTION_SCREENS`, skippable set); `s03-name` never removed; `s01/s02` never reordered.
- A/B metrics: **onboarding completion AND trial-start** (both — a longer flow can lift trial-start while lowering completion; net revenue-per-install is the tiebreaker). Also watch **Letter quality proxies** (moment favorite/refine rates) since more input → richer output.
- Guard: dream-home is a choice screen (low friction) — expect little completion cost, real personalization gain.

### Item 2 — Commitment beat before the paywall — _high lift on trial-start_

**Why:** Glow's single biggest paywall-conversion lift.

**Aura-fit change:** one quiet Conversation beat after `s12-notifications`/before the Letter→paywall, in the future-self voice — _"When your letter arrives, will you let it in?"_ → "I'm ready". Emotional preparation, not a fingerprint gimmick. Behind `useVariant('commit_beat')`.

**Files:** `screens/S13Commit.tsx` + route + `flow.ts` (or a conditional push like the notification screens); copy; `commitment_accepted` event.

**Testing:** unit (routing/no-progress-step); A/B on **paywall initial conversion**; ship only on a win at the sample threshold (~50 conversions/arm). Values check: no pressure, no loss framing.

### Item 3 — First-Home activation: coach-marks + legible personalization — _fixes trial→paid + retention_

**Why:** Glow's trial→paid was ~0 until users saw value fast. Aura's value moment is the Letter (already first), so activation belongs on **first Home arrival**.

**Change:**

- One-time **coach-marks** (2–3 calm tips: the day's moment, how to play it, where affirmation/gratitude live) — flag `firstRunSeen` in `src/lib/storage.ts`, mounted on `app/(tabs)/home.tsx`, never over the Letter.
- **Legible personalization** — a quiet "shaped around {value}" line on the moment, sourcing the "why" from the profile value already in Living Memory. The honest "For You."

**Files:** `FirstRunCoach.tsx` + storage flag; `HomeScreen`/`TodayMomentCard` + copy. Events `firstrun_coach_shown/_completed`.

**Testing:** coach shows exactly once, never covers the Letter; a11y labels; A/B measures **day-2 retention** and **trial→paid**.

### Item 4 — Onboarding length/order A/B ("no-pact") — _once dashboards are trusted_

**Why:** Glow's "no-pact" (one screen removed) won. Length is a dial; only data picks the screen.

**Change:** `useVariant('onboarding_flow')` selecting `SCREEN_ORDER` variants: control; minus-one-low-value screen; struggle (`s10`) reordered; combined with Item 1's depth arm.

**Testing:** consistency unit tests per variant; A/B on **completion AND trial-start**, decide on trial-start / revenue-per-install; never remove `s03-name`, never reorder `s01/s02`.

### Item 5 — Notification opt-in copy A/B — _small, done infra_

The why → ask → second-chance flow shipped. Next: A/B the S12 copy (benefit-led variants) on **permission-grant rate** via the existing `notification_permission_result {granted}` event, behind a flag. No new screens; keep Aura's no-guilt stance.

### Item 6 — The onboarding funnel dashboard — _decision surface_

Build in PostHog from the existing events: completion by screen (find the biggest drop), and the acquisition funnel `onboarding_started → completed → paywall_viewed → trial_started → purchase_completed`. Watch the three rates (download→trial, trial→paid, revenue-per-download) and **day-1/2/7 retention** (via app-open/ritual events — **not** a streak, doc 16).

---

## Part 5 — Sequencing

1. **PostHog flag hook + funnel events** (analytics plan) — unblocks all measurement.
2. **Item 6** dashboards — so decisions have a home.
3. **Item 1** (re-enable dream-home / depth A/B) — highest signal, one line.
4. **Item 2** (commit beat) + **Item 5** (S12 copy) — cheap, high-leverage.
5. **Item 3** (first-Home activation) — trial→paid + retention.
6. **Item 4** (length/order A/B) — once the funnel is trusted.

## Part 6 — The scorecard (what each item moves)

| Item                         | Onboarding completion | Trial-start  | Trial→paid        | Retention  |
| ---------------------------- | --------------------- | ------------ | ----------------- | ---------- |
| Re-enable dream-home / depth | ↓? small              | **↑ (Glow)** | ↑ (richer Letter) | ↑          |
| Commitment beat              | —                     | **↑↑**       | —                 | —          |
| First-Home activation        | —                     | —            | **↑↑**            | **↑↑**     |
| Length/order A/B             | **↑**                 | ↑?           | —                 | —          |
| Notification copy A/B        | —                     | —            | —                 | ↑ (opt-in) |
| Funnel dashboard             | (measures all)        |              |                   |            |

**One-line thesis:** Aura already has the hard part Glow lacked — a real generative wow and clean instrumentation. The gap is the **experimentation layer** and two engineered moments: **depth in the questions** (which Aura _shortened_) and a **value beat right after onboarding**. Build the flag hook, then test depth and activation first.
