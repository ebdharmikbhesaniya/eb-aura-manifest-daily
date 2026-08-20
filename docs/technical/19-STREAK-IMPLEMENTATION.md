# 19 — STREAK: STEP-BY-STEP IMPLEMENTATION

Execution plan for the design in **21-STREAK-SYSTEM**. Read that first for the
_why_; this document is the _how_, in order, with signatures and acceptance
criteria. Written 2026-08-20.

---

## 0. Locked decisions (change these here, not in code)

| Decision        | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Loss model      | Grace-then-reset (option **B**, 21 §3)                                  |
| Held days       | 2 per calendar month, auto-applied, silent                              |
| Reset trigger   | Missed day with no held day left, **or** gap > 3 days                   |
| Counts as a day | Moment played to completion **OR** gratitude line **OR** practice block |
| Day boundary    | Her **local** calendar day (matches `weekDots`)                         |
| Home position   | Under the greeting, above "Today's moment"                              |

---

## 1. THE CONSTRAINT THAT SHAPES EVERYTHING

`packages/shared/src/constants/voice.ts` defines `GUILT_VOCABULARY`, and the
copy lint (`src/copy/copy-lint.test.ts`) fails CI on any user-facing string
containing them. The list includes:

```
'streak'   'you missed'   "you've missed"   "don't lose"   ...
```

**Consequences, non-negotiable unless the founder amends the list:**

1. The word **"streak" can never appear in user-facing copy.** Not on Home, not
   in the history sheet, not in a notification. Hence "days becoming".
2. The line proposed in 21 §4.3 — _"You missed yesterday. I kept your place."_ —
   **fails the lint.** Rewritten below to _"Yesterday stayed open. I kept your
   place."_
3. Internal identifiers are unaffected. The lint reads only `src/copy/*.ts`
   exports, so `streakStore`, `useStreak`, `streak_day_counted` are all fine.

**Step 1 action:** run the lint against the new copy _before_ writing the UI.
It is a two-minute check that otherwise fails at the end of the week.

---

## 2. File plan

```
apps/mobile/src/features/streak/
  day.ts            pure: does today count?
  streak.ts         pure: the state machine
  streak.test.ts
  day.test.ts
  streakStore.ts    zustand + MMKV persistence
  streakStore.test.ts
  StreakCard.tsx    the Home module
  StreakCard.test.tsx
  StreakArc.tsx     Skia ring
  StreakHistorySheet.tsx
  api.ts            supabase read/write
  hooks.ts          TanStack Query wrappers
apps/mobile/src/copy/streak.ts
supabase/migrations/<ts>_streak.sql
```

---

## 3. Step-by-step

### Step 1 — Copy first (0.5 day)

`src/copy/streak.ts`. Writing copy first is deliberate: it is the only part with
a hard CI gate, and it forces the product decisions before any UI exists.

```ts
export const streakCopy = {
  label: 'days becoming',
  dayOne: 'Day one. Again is allowed.',
  longest: 'Longest yet: {n}',
  held: 'Yesterday stayed open. I kept your place.',
  reset: 'Back to day one. Your {n} days still happened.',
  historyTitle: 'Every day you showed up',
  milestone7: "Seven days. There's a letter for that.",
  milestone30: 'Thirty days. Look who you are becoming.',
  milestone100: 'A hundred days.',
} as const;
```

**Acceptance:** `npx jest src/copy/copy-lint` passes. Verify by temporarily
adding `'streak'` to a value and watching it fail — a lint you have not seen
fail is a lint you do not know is running.

---

### Step 2 — `day.ts`, the completion predicate (0.5 day)

One place decides what "showed up" means, so Home, the milestone and the
analytics can never disagree.

```ts
export interface DaySignals {
  momentCompleted: boolean;
  gratitudeWritten: boolean;
  practiceCompleted: boolean;
}

/** True if ANY of the three happened. Generous by design (21 §4.1). */
export function dayCounts(signals: DaySignals): boolean;

/** Her local calendar day as YYYY-MM-DD. */
export function localDay(now: Date): string;
```

Wire the three existing sources — `hasEntryFor` (gratitudeStore),
`isPracticeComplete` (affirmations/practice), and a completion callback from the
player. **Do not** re-derive any of them here.

**Acceptance:** any single signal true → counts; all false → does not.

---

### Step 3 — `streak.ts`, the state machine (1 day)

All pure. No storage, no clock — the caller passes `today`. This is where every
bug will otherwise live.

```ts
export interface StreakState {
  current: number;
  longest: number;
  lastCountedDay: string | null;
  heldDaysUsed: number;
  heldMonth: string; // 'YYYY-MM'
}

export type StreakOutcome =
  | { kind: 'unchanged' } // already counted today
  | { kind: 'extended'; state: StreakState }
  | { kind: 'held'; state: StreakState } // grace consumed
  | { kind: 'reset'; state: StreakState; previous: number };

export function countDay(state: StreakState, today: string): StreakOutcome;
export function heldDaysRemaining(state: StreakState, today: string): number;
export function milestoneReached(outcome: StreakOutcome): 7 | 30 | 100 | null;
```

Rules, in evaluation order:

1. Roll `heldMonth` over first — a new month refills the budget.
2. `today === lastCountedDay` → `unchanged`.
3. `lastCountedDay === null` or gap is 1 day → `extended`.
4. Gap of exactly 2 days (one missed) and a held day remains → `held`,
   `heldDaysUsed++`, current still increments.
5. Gap > 3 days → `reset` regardless of held days.
6. Otherwise → `reset`.
7. `longest = max(longest, current)` on every path **before** any reset zeroes
   `current`. This is what makes "your 34 days still happened" true.

**Acceptance — these exact cases in `streak.test.ts`:**

- consecutive days increment
- same day twice does not double-count
- one missed day with budget → held, count continues
- one missed day with budget exhausted → reset
- four missed days with full budget → reset anyway (rule 5)
- month rollover refills the budget
- `longest` survives a reset
- `lastCountedDay` in the future is ignored, not honoured (clock tampering)
- local day going backwards (timezone travel) never decrements

---

### Step 4 — Storage and store (0.5 day)

Add to `STORAGE_KEYS` in `src/lib/storage.ts`, beside the existing keys:

```ts
streak: 'streak.state',
```

`streakStore.ts` — Zustand, mirroring `onboardingDraft`'s shape (05 §2: small
stores, client state only). It holds `StreakState`, hydrates from `kv.get` on
first read, and exposes `record(signals)` which calls `countDay` and persists.

**It must be safe to call `record` on every relevant event** — the `unchanged`
outcome makes it idempotent, so callers never need to check first.

---

### Step 5 — Wiring the three signals (0.5 day)

| Source    | Where to call `record()`                                             |
| --------- | -------------------------------------------------------------------- |
| Gratitude | after `upsertLocal` succeeds                                         |
| Practice  | inside `increment`, when `isPracticeComplete` flips true             |
| Moment    | on playback completion, **not** on play — starting is not showing up |

The moment case is the one to get right: hook the player's completion, and make
sure a re-listen on the same day is the `unchanged` path.

---

### Step 6 — `StreakArc.tsx` (1 day)

Use **Skia** (`@shopify/react-native-skia` 2.6.9, already a dependency and
already compiling in the iOS build). `react-native-svg` is _not_ installed —
do not add it for one ring.

```tsx
interface StreakArcProps {
  progress: number; // 0–1, position through the current week
  size?: number; // default 88
}
```

A `Circle` background stroke in `colors.surface.border`, and a foreground arc
using `Path` + `sweepGradient` from `emberSoft` → `ember`. Animate `progress`
with Reanimated, honouring `useMotion().reduceMotion` — under Reduce Motion the
arc appears at its final value with no sweep, exactly as `WeekDots` does.

---

### Step 7 — `StreakCard.tsx` on Home (1 day)

Insert into `HomeScreen.tsx` between the greeting row (ends ~line 119) and the
first-run card, so it sits above "Today's moment".

Layout, following 21 §4.2:

- `StreakArc` on the left with the number centred inside it —
  `SerifDisplay variant="title"`, the number alone.
- Right column: `{n} days becoming`, then `Longest yet: {n}` **only when
  `longest > current`**.
- `WeekDots` underneath, reusing the existing component unchanged.
- Whole card `Pressable` → opens the history sheet.

**Do not render it at all when `current === 0` and `longest === 0`.** A zero on
day one is discouragement, and 21 §10 leaves open whether it should appear before
the first letter — until that is answered, hide it rather than guess.

**Acceptance (`StreakCard.test.tsx`):**

- renders the count and label
- hides "Longest yet" when it equals current
- renders nothing at 0/0
- shows the reset line after a `reset` outcome
- shows the held line after a `held` outcome
- opens the sheet on press

---

### Step 8 — History sheet (0.5 day)

`StreakHistorySheet.tsx`, a `Sheet` (so **every input inside it must be
`<Input inSheet />`** — `sheetInputs.test.ts` enforces this repo-wide, though
this sheet likely has no inputs at all).

Shows a month calendar of counted days, held days marked distinctly, and
milestones reached. This is where past runs stay visible — the anti-shame
mechanism in 21 §4.4 depends on this screen existing.

---

### Step 9 — Milestones (0.5 day)

`milestoneReached()` returns 7 / 30 / 100. Wire to the **existing** D7/D30/D100
letter mechanism in `docs/06` rather than inventing a reward. No badges, no
confetti — 16 is right that the celebration here is evidence.

Fire `streak_milestone_reached` and let the letter pipeline do the rest.

---

### Step 10 — Sync (1–2 days)

Migration `supabase/migrations/<timestamp>_streak.sql`, following the style of
`20260817010000_grant_hardening.sql` — **include RLS policies and the grant
layer**; the audit-fix migrations exist because those were missed before.

```sql
alter table public.profiles
  add column streak_current   integer not null default 0,
  add column streak_longest   integer not null default 0,
  add column streak_last_day  date,
  add column streak_held_used integer not null default 0,
  add column streak_held_month text;
```

Profiles rather than a new table: it is one row per user, always read at boot
alongside the profile, and a join saved is a round trip saved.

Sync follows the **gratitude pattern already in the repo** —
`pendingSync` / `markSynced` / `mergeRemote` in `gratitudeStore.ts`. Copy that
shape rather than inventing a second one.

**Merge rule on conflict: take the max of `current` and `longest`, and the later
`lastCountedDay`.** Two devices must never cost her days.

---

### Step 11 — Analytics (0.25 day)

`streak_day_counted`, `streak_milestone_reached`, `streak_held_day_used`,
`streak_reset`, each with `current` and `longest`.

Per 13, and per the sensitive-tier rule in 14 §4: **no entry text, ever.**

Instrument the question from 21 §7 before launch — 7-day retention of users who
reset at least once versus those who never did. If resetters churn, the grace
budget is wrong and you want to know in week one.

---

### Step 12 — Amend the docs and the screenshot (0.5 day)

Not optional; four places currently promise the opposite:

- `16 §Streak-lite` — rewrite.
- `01 §10`, `03 §120` — record the exception and why, or the next person reverts
  this feature on principle.
- `PROJECT-KNOWLEDGE.md §7` — "no streak-loss states exist" is no longer true.
- **`aura-08` App Store screenshot** — re-render without "No streaks. Nothing to
  break." Canvas artboard 08.

---

## 4. Order and estimate

Steps 1–4 are the foundation and must be sequential. Then:

- **Parallel A:** Steps 5, 10, 11 (wiring, sync, analytics)
- **Parallel B:** Steps 6, 7, 8 (arc, card, sheet)
- **Last:** Steps 9 and 12

**~6–7 working days**, plus the screenshot re-render.

---

## 5. Definition of done

- [ ] `npx jest` green across mobile and backend
- [ ] `npx turbo typecheck` clean
- [ ] Copy lint passes **and has been seen to fail** on a planted banned word
- [ ] All nine `streak.test.ts` cases from Step 3 present
- [ ] Card hidden at 0/0; visible and correct at 1, 7, 30
- [ ] Held day consumed silently; history sheet shows it
- [ ] Reset preserves `longest` and shows the gentle line
- [ ] No notification anywhere references the count
- [ ] Migration has RLS **and** grants
- [ ] Two-device merge never decrements
- [ ] Docs in §12 amended; screenshot 08 re-rendered

---

Related: 21 (design and rationale) · 16 (amended) · 14 + `voice.ts` (the copy
gate) · 06 (milestone letters) · 05 §2 (state rules)
