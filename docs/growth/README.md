# Growth Playbook — Glow Teardown → Aura Roadmap

**Created:** 2026-08-10
**What this is:** a case-study teardown of "Glow" (a solo-built affirmations app taken to ~$2k/month profit) turned into a prioritized, values-checked implementation + testing roadmap for **Aura: Manifest Daily**. Grounded in a verified inventory of `apps/mobile`, so nothing here proposes rebuilding what already exists.

## The one lesson

> **Spend ~90% of effort on the onboarding → trial → paywall funnel. >80% of conversions happen there.** Instrument everything, change one thing, A/B it, keep the winner, repeat. Traffic comes _after_ the funnel converts, not before.

## The values guardrail (reads on every item)

Aura has an explicit anti-dark-pattern / anti-resentment doctrine (product 01 §10, product 16). Glow used some mild dark patterns; **we adopt the mechanism, never the coercion.** Out of scope regardless of "it converts": **streaks** (banned, doc 16), **notification guilt / aggressive re-asks**, **countdowns / fake urgency / discount theater**.

## Files

| File                                          | What's in it                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `2026-08-10-glow-case-study-teardown.md`      | The transcript flow, phase by phase, with the learning at each step + Glow's real numbers. |
| `2026-08-10-aura-gap-analysis.md`             | Every Glow lever → have/partial/missing/⛔conflicts, with priority.                        |
| `2026-08-10-onboarding-conversion-plan.md`    | Commit beat, first-Home activation, notif-copy A/B, length A/B, widget — impl + testing.   |
| `2026-08-10-monetization-paywall-plan.md`     | Grace period, store trial config, paywall A/B, trial/price experiments, premium value.     |
| `2026-08-10-analytics-abtesting-plan.md`      | PostHog flags/experiments, funnel events, dashboards, RevenueCat experiments, ASC PPO.     |
| `2026-08-10-aso-ads-launch-plan.md`           | ASO keywords, reviews, organic formats, paid-ads attribution, launch sequencing.           |
| `2026-08-10-appstore-submission-checklist.md` | Privacy-questionnaire discipline, legal links, grace period, Transporter, rejections.      |

## Where Aura already beats Glow (don't re-solve)

Baked **ElevenLabs voice** + a **generative Letter/moment** (a real wow, vs static quotes) · a considered **design system** (Ember & Bone, the Orb) · a **hard paywall + trial-timeline** already shipped (Glow's endpoint) · a **Conversation onboarding** with a **progress header** and a **full per-screen funnel** · **PostHog + GA4 + Sentry**, privacy-clean · **dark mode** day-one.

## Prioritized roadmap

### Now — pure upside, no code or tiny, no values conflict

1. **Billing grace period = 3 days** (both stores). ~10% revenue recovered. _(monetization §1)_
2. **Store config**: 7-day trial on the annual hero + **verify Terms/Privacy resolve and match the App Privacy questionnaire** (unblocks the trial timeline on-device; avoids Glow's rejection). _(monetization §2, submission)_
3. **PostHog feature-flag / experiment hook** + **fill funnel event gaps** (`trial_started`, opt-in result, variant-assigned). The keystone that makes everything else measurable. _(analytics §1–2)_

### Next — high lift, fits Aura in-voice, flagged A/Bs

4. **Commitment beat** before the paywall (calm, future-self voice — not a fingerprint gimmick). _(onboarding §1)_
5. **S12 notification-copy A/B** (lift opt-in without adding a screen; keep Aura's no-guilt stance). _(onboarding §3)_
6. **First-Home coach-marks + legible "chosen for you today"** (activation → day-2 retention). _(onboarding §2)_
7. **Paywall A/B** (single timeline vs 3-step) + **trial-length** (3 vs 7) via **RevenueCat experiments**. _(monetization §3–4, analytics §4)_
8. **Retention + RPD dashboards**; **ASC icon PPO**. _(analytics §3, §5)_

### Then — bigger bets / backlog

9. **Home-screen widget** (retention + demo asset) — its own native spec (brainstorming → writing-plans). _(onboarding §5)_
10. **Premium value** beyond "unlimited": tasteful **background/paper set** + **premium vendor-voice** reading. _(monetization §5)_
11. **Onboarding length A/B** once dashboards are trusted. _(onboarding §4)_

### Acquisition — only after the funnel converts

12. **ASO** (title/subtitle keywords, per-market), **seed + reply to reviews**, **organic content** (POV / demo / transformation), then **paid ads** with **attribution first** and **3-day learning windows**, chasing **free ad credits**. _(aso-ads plan)_

## How to run an item (the loop)

1. Pick one item. 2. Add/confirm its metric + event. 3. Put it behind a flag/experiment with **control = current behavior**. 4. Ship, let it reach the sample threshold (~300 users / ~50 conversions per arm). 5. Decide on the **conversion/revenue** metric, not a vanity metric. 6. Keep the winner, delete the loser path. 7. Next item.
