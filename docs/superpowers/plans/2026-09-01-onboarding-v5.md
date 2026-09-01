# Onboarding v5 ("Aura Ember Onboarding v5") Implementation Plan

**Goal:** Replace the mobile onboarding UI + flow with the claude.ai/design
"Aura Ember Onboarding v5" flow — every step, section, option, and ordering —
while keeping the existing sync (`commit.ts` / `onboardingDraft`) and the
paywall/letter plumbing untouched.

**Source:** design project `8cced4df-431e-4937-9647-49e8ac1325c6`,
`Aura Ember Onboarding v5.dc.html` (orchestrator: BOARD + `nextFrom`/`act`)
and `Aura Ember Screen v5.dc.html` (per-step UI, option catalogs, copy).

**Scope decision (user, 2026-09-01):** UI + flow only. Sync and paywall stay.

## Global constraints

- Tokens only — no raw hex in screens (`palette.ts` rule). Dark comes from tokens.
- Copy lives in `src/copy/onboarding.ts`; the copy lint bans `streak`, urgency words.
- Screen ids are analytics keys (`OnboardingScreenId`); retired ids stay in the type.
- Product 07: revise, never restart → design's "Not quite → restart" becomes the edit-guard.
- The OS notification ask + `completeOnboarding` + `generating` handoff stay as-is.

## Flow (design step → app screen id → answer → profile column)

| Design                     | Screen id                                           | Answer                                    | Column                            |
| -------------------------- | --------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| 1 Splash                   | `a01-splash`                                        | none (auto 2.4s / tap)                    | —                                 |
| 2 Contract                 | `a02-value`                                         | none                                      | —                                 |
| 4 Q1 Goal                  | `a04-goals`                                         | multi ≤3, keys                            | `values` (primary first)          |
| 5 Q2 Priority              | `q-priority`                                        | choice (auto-skip if 1 goal)              | — (audit; also reorders `values`) |
| 6 Q3 Context               | `q-context`                                         | choice, branched on primary; habits skips | —                                 |
| 7 Q4 Name+pronoun          | `s03-name` + `q-pronoun`                            | text (skippable) + chip                   | `name`                            |
| 8 VALUE first one          | `a11-affirmation`                                   | none (reroll)                             | —                                 |
| 9 Q5 Mood                  | `a05-feeling`                                       | choice → gentle_mode                      | `feeling`                         |
| 10 VALUE insight/support   | `v-insight`                                         | none (variant by mood)                    | —                                 |
| 11 Q6 Obstacle             | `a06-obstacle`                                      | choice (label)                            | `struggle`                        |
| 12 Q7 Lexicon              | `q-lexicon`                                         | choice                                    | —                                 |
| 13 Q8 Off limits           | `q-offlimits`                                       | `{words[], topics[]}` (skippable)         | —                                 |
| 14 Q9 Belief               | `q-belief`                                          | choice (identity hidden in gentle)        | —                                 |
| 15 Q10 Calibration         | `q-calibration`                                     | choice, conditional                       | —                                 |
| 16 Reflect-back            | `v-reflect`                                         | none                                      | —                                 |
| 17 Q11 Time                | `a08-ritual-time`                                   | choice                                    | `arrival_time`                    |
| 18 VALUE gratitude         | `v-gratitude`                                       | text (skippable)                          | —                                 |
| 19 AI consent              | `v-consent`                                         | choice `model`/`library`                  | —                                 |
| 22 Notification pre-prompt | `s12-notifications`                                 | OS ask                                    | —                                 |
| 27 Second chance           | `s12b-notifications` (route)                        | OS ask                                    | —                                 |
| 20/21/23–26                | existing `generating` → `letter` → `paywall`/`home` | kept                                      | —                                 |

Branching (`flow.ts`, pure):

- `a04-goals` → `q-priority` if >1 goal, else (`habits` ? `s03-name` : `q-context`)
- `q-priority` → `habits` ? `s03-name` : `q-context`
- `q-belief` → `q-calibration` if contradiction, else `v-reflect`;
  contradiction = (gentle && identity) || (!gentle && practical && obstacle=selfdoubt)
- gentle = mood ∈ {low, struggling}
- `previousScreen` = predecessor on the simulated path; progress = position among
  question screens on that path.

Deviation flagged: design puts loader + plan reveal (20/21) before notifications;
the app keeps notifications → generating → letter (the paywall plumbing) so the
route gate can resume it. Everything else is in design order.

Dropped from the flow (routes + screens + copy deleted): `a03-social-proof`,
`a10-commitment`, `a12-reminder`, `s01-welcome`, `s02-meet-aura`,
`s04-self-description`, `s05-work-feeling`, `s06-values`, `s07-dream-home`,
`s10-struggle`, `s11-arrival-time`, `s12-why-notifications`, `s13-commit`.

## Tasks

1. Shared types + `values` ≤3 migration + copy catalog.
2. `flow.ts` with branching + tests; `onboardingDraft` resume over the path.
3. Components: `OnboardingHeader` (back circle, ember track, Skip),
   `AnswerRow` (design rows: dot / icon-tile+check), `OptionChip`,
   `BeliefCard`, `Eyebrow`, `ChoiceScreen` (single-select w/ auto-advance),
   `ConversationScreen` restyle.
4. Screens 1–19 (+ virtual pronoun), notifications 22/27 restyled to design.
5. Routes: add new, delete retired; `EditGuardSheet` labels; `useHiddenScreens`.
6. Tests: flow, draft, commit (goals ordering), screens, completion; copy lint.
7. Typecheck, lint, jest; commit.
