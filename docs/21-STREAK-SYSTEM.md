# 21 — STREAK SYSTEM (R&D)

Research and design for a prominent, habit-forming streak on Home.
Written 2026-08-20. **Amends 16 §Streak-lite**, which currently forbids this.

---

## 0. The conflict, stated once

Four places in this repo currently promise the opposite of what is designed below:

- `16 §Streak-lite`: "NO break-state exists in the design system."
- `03 §120`: "Punitive streaks churn exactly the anxious users this category serves."
- `14`: "🔥 Don't lose your streak!" is the canonical BAD notification.
- **App Store screenshot 08 ships the line "No streaks. Nothing to break."**

That last one is not a doc — it is a public claim in an asset queued for
submission. **If this ships, that screenshot must be re-rendered.** It is
`aura-08-1242x2688.png` and the line is in the canvas as a bullet.

The founder's call is to build it. This document does that — but it takes the
existing principles seriously as _engineering constraints_, because the research
below says the shame-free version is also the higher-retention version. That is
a convenient result, and it is worth checking rather than assuming.

---

## 1. What actually creates the obsession

A streak is not motivating because it counts. It is motivating because of four
mechanisms, and a design that omits any of them produces a number nobody cares
about — which is exactly what the current dots row is.

**1. Loss aversion.** People work harder to protect something than to gain it.
Duolingo: as streaks lengthen, users shift from _extending_ to _protecting_ —
they practise on days they do not want to, purely to avoid the loss. **This is
the engine. It requires that loss be genuinely possible.**

**2. Endowed progress.** A counter that is visibly already moving pulls harder
than one at zero. This is why day 1 should not read "1" in isolation.

**3. Visible, unavoidable placement.** A streak the user has to navigate to does
not form a habit. It has to be on the surface they already open.

**4. Milestone punctuation.** Duolingo shipped milestone animations and saw
**+1.7% likelihood of returning after 7 days**. Discrete, anticipated events beat
a smoothly incrementing number.

## 2. And what breaks it

Duolingo's own warning, in their words: losing a streak _"can have the opposite
effect, and actually feel quite demotivating"_ — and the fear of losing one
"might prevent people from starting altogether."

Their fix is **slack**, not severity. Streak Freeze pauses a day without breaking
the chain. Doubling equipped Freezes from one to two produced **+0.38% daily
active learners** — a large number at their scale, and notably it came from
making the streak _easier_, not harder.

So the evidence points the same way `03 §120` already did: the break is where
churn happens. The difference is that `16` responded by removing loss entirely,
which also removed the engine.

---

## 3. The three real options

|                          | Loss state                    | Obsession | Churn risk                                | Fits brand    |
| ------------------------ | ----------------------------- | --------- | ----------------------------------------- | ------------- |
| **A. Hard reset**        | Miss a day → 0                | Highest   | **Highest** — one bad week and she's gone | No            |
| **B. Grace, then reset** | 2 held days/month, then reset | High      | Moderate                                  | With care     |
| **C. Never resets**      | None                          | ~None     | None                                      | Yes (current) |

**Recommendation: B.** It is the only option that gives you the loss aversion
you asked for while keeping the failure mode humane, and it is the option
Duolingo's own experiments support. C is what exists today and it is why nobody
is obsessed with the dots.

The honest engineering truth, stated plainly: **you cannot have obsession without
a real possibility of loss.** If the founder wants the number to grip, something
has to be genuinely losable. B makes losing it take about three weeks of
disengagement rather than one busy Tuesday.

---

## 4. Design: "Days becoming"

### 4.1 What counts as a day

One of these, whichever she does first — the existing predicates already exist:

- Played today's moment to completion, **or**
- Wrote today's gratitude line (`hasEntryFor`), **or**
- Completed an affirmation practice block (`isPracticeComplete`)

Deliberately generous. The ask is "show up", not "do all three". A single
predicate in `features/streak/day.ts` so Home, the notification and the milestone
letter can never disagree.

### 4.2 On Home

Position: **immediately under the greeting, above "Today's moment."** That is the
first thing below the fold-free area and the only slot that satisfies mechanism 3.
It pushes "Coming for you" down; that is the correct trade.

```
  WEDNESDAY, AUGUST 19
  Good morning, Maya.                          ◐ orb

  ┌──────────────────────────────────────────┐
  │   ◜◝                                     │
  │  ◜ 12 ◝     12 days becoming             │
  │   ◟◞        Longest yet: 12              │
  │             ● ● ● ● ● ○ ○                │
  └──────────────────────────────────────────┘

  TODAY'S MOMENT
  …
```

- **The number is the hero** — Newsreader, ~48pt, ink. Not a flame, not a badge.
  An ember **arc** sweeps around it, filling across the week.
- **"days becoming"** — identity framing, per `16 §Milestone system`. Not
  "day streak".
- **"Longest yet"** appears only once it exceeds the current run, so a reset
  leaves visible evidence that the earlier work happened. This is the single most
  important anti-shame detail: the past is never deleted, only the current run.
- The seven dots survive underneath, so the week is still readable at a glance.
- Tapping opens a history sheet — full calendar, milestones reached, held days
  used.

### 4.3 Held days (the slack)

- **Two per calendar month**, replenishing on the 1st.
- **Applied automatically and silently.** No shop, no currency, no "spend a
  freeze?" dialog. She learns it happened from the history sheet, not a modal.
- Copy when one is used, on next open: _"You missed yesterday. I kept your
  place."_ — states the fact, removes the sting, names no failure.
- When both are gone and a day is missed, the run ends.

### 4.4 The reset, when it happens

This is the moment that decides whether the feature helps or churns her. It must
be the gentlest screen in the app.

- No modal. No animation. No "streak lost".
- Home simply reads: **"Back to day one. Your 34 days still happened."**
- The history sheet keeps every past run intact.
- **Never send a notification about a broken streak.** `14` bans the vocabulary
  and this is where it would leak back in first.

### 4.5 Milestones — reuse what exists

D7, D30 and D100 milestone letters are already specified in `16` and `06`. Tie
them to the streak rather than to calendar age: the arc completes, and the letter
is the reward. That is Duolingo's +1.7% mechanic, except the payoff is the thing
this app is actually good at — a letter quoting her own words back.

No badges, no confetti. `16` is right that this product's celebration is
evidence, not fireworks.

---

## 5. Data model

Local first, MMKV, mirrored to Supabase for cross-device:

```ts
interface StreakState {
  current: number;
  longest: number;
  lastCountedDay: string; // YYYY-MM-DD, her local calendar day
  heldDaysUsed: number; // this calendar month
  heldMonth: string; // YYYY-MM, for the reset
}
```

Rules, all pure and unit-testable:

- Evaluated on **local calendar day**, matching `weekDots`' existing convention.
- A day is counted once; doing all three activities does not count three.
- Gap of exactly 1 day → consume a held day if available, else reset.
- Gap > 3 days → reset regardless. Held days cover a missed day, not a missed
  week; letting two freezes span a fortnight makes the number meaningless.
- **Clock tampering:** a `lastCountedDay` in the future is ignored, not honoured.
- Timezone travel: never _decrement_. If the local day goes backwards, hold.

---

## 6. Copy (must pass the copy lint)

| Surface       | Line                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| Home, active  | "{n} days becoming"                                                                       |
| Home, day 1   | "Day one. Again is allowed."                                                              |
| Held day used | "You missed yesterday. I kept your place."                                                |
| After reset   | "Back to day one. Your {longest} days still happened."                                    |
| Milestone 7   | "Seven days. There's a letter for that."                                                  |
| Notification  | "Julia — this morning's is about the studio." _(unchanged; the streak is never the hook)_ |

Banned here, explicitly: 🔥, "Don't lose", "streak", "you missed {n} days",
countdowns, and any notification whose subject is the number.

---

## 7. Analytics

`streak_day_counted`, `streak_milestone_reached`, `streak_held_day_used`,
`streak_reset` — with `current` and `longest` as properties.

The number that decides whether this was a good idea: **7-day retention of users
who reset at least once, versus those who never did.** If resetters churn, B is
behaving like A and the grace budget needs raising. Instrument this before
launch, not after.

---

## 8. What else must change

- **Screenshot 08** — re-render without "No streaks. Nothing to break." The
  canvas is `Aura App Store Screenshots v3.dc.html`, artboard 08.
- **`16 §Streak-lite`** — rewrite; it currently forbids this outright.
- **`01 §10` / `03 §120`** — add the exception and the reasoning, so the next
  person does not read the ban and revert the feature.
- `PROJECT-KNOWLEDGE.md §7` "no streak-loss states exist" — no longer true.

---

## 9. Phases

1. **Logic** (1–2 days) — `features/streak/`, pure functions, full unit tests
   for gaps, held days, month rollover, timezone and clock tampering.
2. **Home module** (2 days) — arc, number, longest, dots, history sheet.
3. **Milestones** (1 day) — wire D7/D30/D100 to the streak.
4. **Sync** (1–2 days) — Supabase column, merge on conflict by taking the max.
5. **Copy + analytics + docs** (1 day).

~1 week. Nothing here is technically hard; the risk is entirely in §3's choice.

---

## 10. Open questions

1. **Is the founder accepting the churn trade in §3?** B is chosen; A is
   available if the answer is "maximum grip regardless".
2. **Two held days per month, or three?** Duolingo's win came from _more_ slack.
3. Does the streak appear before the first letter, or only after onboarding
   completes? Showing "1 day" to someone who has not had the wow yet is noise.
4. Cross-device: if she is on two phones, does the max win or the merge?

---

Related: 16 (retention — amended) · 03 §120 (why this was banned) ·
14 (voice — the copy in §6 is the compliance boundary) · 06 (D7/D30/D100 letters)
