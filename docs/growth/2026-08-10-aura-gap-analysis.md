# Aura vs Glow — Gap Analysis & Value-Fit

**Date:** 2026-08-10
**Source:** Glow teardown + a codebase inventory of `apps/mobile` (verified 2026-08-10).
**Goal:** for each Glow lever, state what Aura already has, what's missing, and — crucially — **whether the tactic fits Aura's product values** before it goes on a roadmap.

> **The values guardrail.** Aura is built against an explicit anti-resentment / anti-dark-pattern doctrine (product 01 §10, product 16). Several of Glow's growth tactics are mild dark patterns (aggressive re-asks, streak guilt, urgency). **Adopt the mechanism, not the coercion.** Where a lever conflicts with Aura's docs, this file says so and proposes the honest version.

Legend: ✅ have · 🟡 partial · ❌ missing · ⛔ conflicts with Aura values (adapt or skip)

---

## Onboarding & conversion

| Glow lever                                         | Aura status | Notes / recommendation                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One-question-per-screen onboarding                 | ✅          | The "Conversation" (`flow.ts`, S01–S12). Already the right shape.                                                                                                                                                                                                                                               |
| Progress bar during onboarding                     | ✅          | `ProgressHeader.tsx` — slim ember fill + honest `step/total`. Glow's "forgot it" win is already banked.                                                                                                                                                                                                         |
| Per-screen funnel / drop-off analytics             | ✅          | `onboarding_screen_viewed` per screen + `onboarding_answer_submitted` + `onboarding_completed`. Ready for A/B.                                                                                                                                                                                                  |
| **Segmentation questions matter (don't cut them)** | 🟡          | Aura asks name/self-description/work-feeling/values/struggle/arrival-time. Glow's data: removing personal questions **killed** conversion. **Before trimming onboarding, A/B it** — do not assume shorter is better.                                                                                            |
| **Commitment ceremony before the paywall**         | ❌          | No hold-to-commit screen. **Fits Aura if done in-voice** (a quiet "I'm ready to meet my future self" beat, not a coercive fingerprint gimmick). High expected lift. → onboarding plan.                                                                                                                          |
| Pre-permission "why notifications" explainer       | ✅ (soft)   | S12 shows an explainer Card before the OS prompt. Aura already does the gentle version.                                                                                                                                                                                                                         |
| Post-decline "you're missing out" screen           | ⛔          | Aura **deliberately** avoids re-asking ("denial is a legitimate answer"; `permissionGate` shows at most a weekly quiet hint). Glow's harder screen **conflicts** — keep Aura's stance; at most, test a _single_ gentle in-context re-offer, never a guilt screen.                                               |
| Post-onboarding tutorial / coach-marks             | ❌          | No walkthrough. **Fits** (helps first-session activation → retention). But Aura's first post-onboarding beat is the **Letter (the wow)** — a tutorial must not step on it. Place coach-marks on **first Home arrival**, after the Letter+paywall. → onboarding plan.                                            |
| "For You" recommendations from answers             | 🟡→❌       | Onboarding answers seed **Living Memory** (personalizes generated content) but there's **no user-facing For-You surface**. Aura's personalization is deeper than Glow's (generative), just invisible. Consider a light "chosen for you today" framing to _make the personalization legible_. → onboarding plan. |

## Monetization

| Glow lever                                 | Aura status    | Notes / recommendation                                                                                                                                                                     |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RevenueCat + hard trial paywall            | ✅             | Just shipped: hard gate + trial-timeline (`PaywallScreen.tsx`), the **exact one-info pattern** Glow converged on.                                                                          |
| One-info-per-screen paywall _sequence_     | 🟡             | Aura's is one rich screen (timeline = the three beats on one page). Glow split into **separate screens**. **A/B**: single trial-timeline screen vs a 3-step sequence. → monetization plan. |
| Yearly hero + short free trial             | ✅             | Annual hero + 7-day trial (store-config pending). Glow used 3-day; **trial length is an A/B lever** (3 vs 7).                                                                              |
| Per-country pricing                        | ✅ (delegated) | Aura reads localized store prices from RevenueCat — the correct approach; no manual per-country table needed. Not a gap.                                                                   |
| **Billing grace period**                   | ❌             | Not configured. Glow: **~10% of revenue** recovered for zero work. **Do this first — pure upside, no code, no values conflict.** → monetization plan.                                      |
| RevenueCat paywall experiments             | ❌             | No experiments. Add for paywall/trial/price A/B. → analytics plan.                                                                                                                         |
| Restore + legal links + renewal disclosure | ✅             | All present on the wall.                                                                                                                                                                   |

## Analytics & A/B

| Glow lever                                | Aura status | Notes                                                                                                                                                                                |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PostHog + ad-attribution analytics        | ✅          | PostHog (catalog-only, autocapture off) + GA4 fan-out + PostHog Error Tracking. Privacy-clean by design.                                                                             |
| PostHog **experiments / feature flags**   | ❌          | No `getVariant` / flags / experiment hooks. **This is the single highest-leverage infra add** — it unlocks data-driven onboarding iteration (Glow's whole method). → analytics plan. |
| RevenueCat experiments                    | ❌          | See monetization.                                                                                                                                                                    |
| ASC Product Page Optimization (icon A/B)  | ❌          | Store-side; queue an icon test. → analytics plan.                                                                                                                                    |
| Time-of-day ad targeting from trial hours | ❌          | Needs the RC data pull; ads-phase optimization. → ads plan.                                                                                                                          |

## Engagement

| Glow lever                              | Aura status                   | Notes / recommendation                                                                                                                                                                                                            |
| --------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home-screen **widgets**                 | ❌                            | No native widgets. **High-fit, high-retention** — a daily affirmation/orb widget is very on-brand and a strong demo asset. Native (WidgetKit / App Widget) via Expo config plugin. Bigger build. → onboarding/engagement backlog. |
| Voice reading affirmations              | ✅ (device TTS) + baked voice | `useSpeech.ts` "Hear it read" (device voice) + moments/Letter use **baked ElevenLabs** audio. Aura is **ahead** of Glow's late TTS. A premium _vendor-voice_ affirmation reading could be a paid upsell.                          |
| Selectable backgrounds/themes (premium) | ❌                            | Affirmation surface color fixed. A tasteful **premium background/paper set** is competitor parity + a cosmetic upsell that raises trial→paid. Must stay within Ember & Bone taste. → monetization backlog.                        |
| Dark mode                               | ✅                            | `userInterfaceStyle: automatic`, day-one.                                                                                                                                                                                         |
| **Streaks / daily-habit guilt**         | ⛔                            | **Banned by product doc 16.** Do **not** propose streaks. Aura's daily loop is the moment/affirmation/gratitude ritual, not a counter. The `369 practice` resets daily on purpose.                                                |
| TikTok-style swipe feed                 | ❌                            | Home is a single moment card, not a paging feed. Low priority — Aura's value is the _generated Letter/moment_, not a quote firehose. Skip unless data asks.                                                                       |

## Store / release

| Glow lever                                   | Aura status | Notes                                                                                                                                                                          |
| -------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Terms + Privacy URLs                         | ✅          | Env-driven, in Settings + paywall footer; required for prod. **Verify the URLs resolve & match the App Privacy questionnaire.**                                                |
| App Privacy questionnaire discipline         | 🟡          | Coded posture is clean (autocapture off, no mic, ATT string). The **ASC declaration itself is manual** — get "Tracking = No" right (Glow's rejection). → submission checklist. |
| ASO keyword strategy                         | 🟡          | `storeTitle: 'Aura: Manifest Daily'`; no keyword/subtitle metadata plan. → ASO plan.                                                                                           |
| Grace period / Transporter / free ad credits | ❌          | Operational wins to adopt. → submission + ads plans.                                                                                                                           |

---

## Priority read (details + testing in the sibling plans)

**Do first — pure upside, no values conflict, small effort:**

1. **Billing grace period = 3 days** (both stores). ~10% revenue, zero code.
2. **Store config**: 7-day trial on the annual hero + verify Terms/Privacy match the App Privacy questionnaire (unblocks the whole paywall + avoids Glow's rejection).
3. **PostHog experiments/feature-flag hook** — the infra that makes every later change measurable.

**Do next — high lift, fits Aura if done in-voice:** 4. **Commitment beat** before the paywall (calm, not coercive) — A/B it. 5. **First-Home coach-marks + a legible "chosen for you today"** — activation → retention. 6. **Paywall A/B** (single trial-timeline vs 3-step; 3-day vs 7-day trial; RevenueCat experiments).

**Bigger bets / backlog:** 7. **Home-screen widget** (retention + demo asset). 8. **Premium cosmetic** (backgrounds/paper) + premium vendor-voice reading.

**Explicitly NOT doing (values):** streaks (⛔ doc 16), aggressive post-decline notification guilt (⛔), fake urgency/countdowns/discount theater (⛔ doc 01 §10).
