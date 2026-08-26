# Onboarding Flow — Screens up to the Paywall

The full sequence a new user walks, from first launch to the paywall. It has three
segments:

1. **The Conversation** — `SCREEN_ORDER` in `src/features/onboarding/flow.ts`. One
   question (or beat) per screen, fixed order.
2. **The handoff** — the notification ask closes onboarding, then the generation
   ritual runs and the first Letter is revealed.
3. **The paywall** — shown after the first Letter, only if the user is not already
   premium.

Route files live in `apps/mobile/app/(onboarding)/`; feature components live in
`apps/mobile/src/features/onboarding/screens/`.

> Legend — **Answer**: what the screen collects. `none` = a "moment" beat that
> carries no answer and no progress step. Only answer-carrying screens count toward
> the progress header.

---

## 1. The Conversation (`SCREEN_ORDER`)

| #   | Screen id              | On-screen title                                                                         | Answer         | Component            | Notes                                                        |
| --- | ---------------------- | --------------------------------------------------------------------------------------- | -------------- | -------------------- | ------------------------------------------------------------ |
| 1   | `a01-splash`           | Aura splash                                                                             | `none`         | `A01Splash`          | Funnel front-matter (2026-08-26). Replaces `s01-welcome`.    |
| 2   | `a02-value`            | "Rewire your mornings" / "Manifest with intention" / "Feel calm, grateful, unstoppable" | `none`         | `A02Value`           | Three-panel value beat.                                      |
| 3   | `a03-social-proof`     | "Join half a million building a daily ritual"                                           | `none`         | `A03SocialProof`     | Social proof + reviews.                                      |
| 4   | `a04-goals`            | "What do you most want to bring into your life?"                                        | `multi_choice` | `A04Goals`           | Choose up to two → `values`.                                 |
| 5   | `a05-feeling`          | "How have you been feeling lately?"                                                     | `choice`       | `A05Feeling`         | New; drives the safety router.                               |
| 6   | `a06-obstacle`         | "What usually gets in your way?"                                                        | `choice`       | `A06Obstacle`        | → `struggle`.                                                |
| 7   | `s03-name`             | "What should I call you?"                                                               | `text`         | `S03Name`            | Never skippable.                                             |
| 8   | `s04-self-description` | "…how would you describe yourself?"                                                     | `text`         | `S04SelfDescription` | **Skippable.**                                               |
| 9   | `s05-work-feeling`     | "And the work you do now — how does it feel?"                                           | `choice`       | `S05WorkFeeling`     |                                                              |
| 10  | `s07-dream-home`       | "Where do you live, in the life you want?"                                              | `choice`       | `S07DreamHome`       | Sensory concreteness for vivid Letters.                      |
| 11  | `a08-ritual-time`      | "When will you do your ritual?"                                                         | `choice`       | `A08RitualTime`      | Preset picker → `arrival_time`. Replaces `s11-arrival-time`. |
| 12  | `a10-commitment`       | "Ready to commit three minutes a day?"                                                  | `none`         | `A10Commitment`      | Centered orb moment. Replaces `s13-commit`.                  |
| 13  | `a11-affirmation`      | "Your first affirmation"                                                                | `none`         | `A11Affirmation`     | First felt payoff before any ask.                            |
| 14  | `a12-reminder`         | "This is how I'll reach you."                                                           | `none`         | `A12Reminder`        | Notification pre-prompt; previews the real push.             |
| 15  | `s12-notifications`    | "Ready to let them in?"                                                                 | `none`         | `S12Notifications`   | The OS permission ask. **Closes onboarding.**                |

**Progress denominator:** 8 answer-carrying screens (`a04`, `a05`, `a06`, `s03`,
`s04`, `s05`, `s07`, `a08`) — the "n / 8" counter.

**Retired but kept (ids/columns preserved, screens removed from flow):**
`s02-meet-aura`, `s06-values`, `s08-dream-city`, `s09-people`, `s10-struggle`,
`s11-arrival-time`, `s12-why-notifications`, `s13-commit`.

---

## 2. The handoff

| Screen id            | On-screen title                           | Component              | When shown                                                                                                                                    |
| -------------------- | ----------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `s12b-notifications` | "Your moment can't reach you on its own." | `S12NotificationsMore` | **Conditional** — only if the user declined the OS prompt or tapped "Maybe later" on `s12-notifications`. Shown once. Also stamps completion. |
| `generating`         | Generation ritual                         | `generating.tsx`       | After completion is stamped. `router.replace('/letter')` when ready.                                                                          |
| `letter` (`/letter`) | The first Letter reveal                   | `LetterScreen`         | On finish: `router.replace(premium ? '/(tabs)/home' : '/paywall')`.                                                                           |

---

## 3. Paywall

- **Route:** `app/paywall.tsx`
- **Reached from:** `app/letter.tsx:89` — shown after the first Letter **only when the
  user is not premium** (premium users go straight to `/(tabs)/home`).

This is the end of the onboarding funnel.

---

## Path summary

```
a01-splash → a02-value → a03-social-proof → a04-goals → a05-feeling → a06-obstacle
  → s03-name → s04-self-description → s05-work-feeling → s07-dream-home
  → a08-ritual-time → a10-commitment → a11-affirmation → a12-reminder
  → s12-notifications
      └─(declined / "maybe later")→ s12b-notifications
  → generating → letter
      └─(not premium)→ paywall
```
