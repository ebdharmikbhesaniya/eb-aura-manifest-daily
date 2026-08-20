import { daysBetween, monthOf } from './day';

/**
 * The count's state machine (21 §3, technical 19 §3).
 *
 * Pure: no storage, no clock. The caller passes `today`, which is what makes
 * every rule below testable — including the ones that only occur across a
 * month boundary, a timezone change, or a tampered device clock.
 *
 * The model is grace-then-reset. Two held days a month absorb a missed day, and
 * after that the count really does go back to one. That loss is deliberate:
 * without a genuine possibility of losing it, there is no loss aversion and no
 * reason to care — the dots row it replaces proved exactly that. What is NOT
 * deliberate is punishment, hence `longest`, which survives every reset so her
 * past work is never erased.
 */
export interface StreakState {
  current: number;
  longest: number;
  /** `YYYY-MM-DD`, or null before the first counted day. */
  lastCountedDay: string | null;
  heldDaysUsed: number;
  /** `YYYY-MM` the held budget belongs to. */
  heldMonth: string;
  /**
   * The days that actually counted, newest first, capped at `HISTORY_DAYS`.
   *
   * `lastCountedDay` alone cannot draw the ring: it says when she last showed
   * up, not which of the last seven days she did. And gratitude's `weekDots`
   * cannot stand in for it either — a day earned by finishing a moment would
   * render empty, which is a visible lie about her own week.
   *
   * Bounded because this is the one field that would otherwise grow forever in
   * MMKV; a year of history has no reader.
   */
  countedDays: string[];
}

/** Enough for the ring, the month view in the history sheet, and no more. */
export const HISTORY_DAYS = 40;

/** Held days granted per calendar month (21 §4.3). */
export const HELD_DAYS_PER_MONTH = 2;

/**
 * Beyond this, grace does not apply however much budget is left.
 *
 * A held day covers a missed day, not a missed week. Letting two held days
 * bridge a fortnight would make the number mean nothing, which is the one
 * failure this design cannot survive — an unlosable count is decoration.
 */
export const MAX_GAP_FOR_GRACE = 3;

export type StreakOutcome =
  /** Already counted today. Callers can fire on every event without checking. */
  | { kind: 'unchanged'; state: StreakState }
  | { kind: 'extended'; state: StreakState }
  /** A missed day, absorbed by grace. The count continues. */
  | { kind: 'held'; state: StreakState }
  /** The run ended. `previous` is what it reached, for the copy. */
  | { kind: 'reset'; state: StreakState; previous: number };

export function emptyStreak(today: string): StreakState {
  return {
    current: 0,
    longest: 0,
    lastCountedDay: null,
    heldDaysUsed: 0,
    heldMonth: monthOf(today),
    countedDays: [],
  };
}

/** Newest first, deduped, bounded. */
function withCountedDay(state: StreakState, day: string): StreakState {
  if (state.countedDays.includes(day)) return state;
  return { ...state, countedDays: [day, ...state.countedDays].slice(0, HISTORY_DAYS) };
}

/**
 * The last seven days as the ring draws them, oldest first — the same shape and
 * order `weekDots` returns, so the two are interchangeable at a call site.
 */
export function weekFrom(state: StreakState, today: string): boolean[] {
  const days = new Set(state.countedDays);
  return Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    return days.has(date.toISOString().slice(0, 10));
  });
}

/** A new calendar month refills the budget. */
function rollHeldMonth(state: StreakState, today: string): StreakState {
  const month = monthOf(today);
  if (state.heldMonth === month) return state;
  return { ...state, heldMonth: month, heldDaysUsed: 0 };
}

export function heldDaysRemaining(state: StreakState, today: string): number {
  const rolled = rollHeldMonth(state, today);
  return Math.max(0, HELD_DAYS_PER_MONTH - rolled.heldDaysUsed);
}

/** `longest` is raised BEFORE any reset, so a reset can never erase her best. */
function withLongest(state: StreakState): StreakState {
  return { ...state, longest: Math.max(state.longest, state.current) };
}

/**
 * Record that today counted.
 *
 * Idempotent by design — a second call on the same day returns `unchanged`, so
 * the gratitude, practice and player call sites can all fire freely without
 * coordinating.
 */
export function countDay(input: StreakState, today: string): StreakOutcome {
  const state = rollHeldMonth(input, today);

  if (state.lastCountedDay === null) {
    const next = withLongest(
      withCountedDay({ ...state, current: 1, lastCountedDay: today }, today),
    );
    return { kind: 'extended', state: next };
  }

  const gap = daysBetween(state.lastCountedDay, today);

  // Unparseable stored day — treat as a fresh start rather than crash on data
  // we cannot reason about.
  if (gap === null) {
    return {
      kind: 'extended',
      state: withLongest(withCountedDay({ ...state, current: 1, lastCountedDay: today }, today)),
    };
  }

  // Same day, or a clock that has gone backwards. Never decrement: a user who
  // flies west, or whose device clock is wrong, must not lose days for it.
  if (gap <= 0) return { kind: 'unchanged', state };

  if (gap === 1) {
    const next = withLongest(
      withCountedDay({ ...state, current: state.current + 1, lastCountedDay: today }, today),
    );
    return { kind: 'extended', state: next };
  }

  const missed = gap - 1;
  const remaining = HELD_DAYS_PER_MONTH - state.heldDaysUsed;

  if (gap <= MAX_GAP_FOR_GRACE && missed <= remaining) {
    const next = withLongest(
      withCountedDay(
        {
          ...state,
          current: state.current + 1,
          lastCountedDay: today,
          heldDaysUsed: state.heldDaysUsed + missed,
        },
        today,
      ),
    );
    return { kind: 'held', state: next };
  }

  const previous = Math.max(state.current, 0);
  const raised = withLongest(state);
  return {
    kind: 'reset',
    previous,
    state: withCountedDay({ ...raised, current: 1, lastCountedDay: today }, today),
  };
}

/** The milestone this outcome just reached, if any. Nulls on every other day. */
export function milestoneReached(outcome: StreakOutcome): 7 | 30 | 100 | null {
  if (outcome.kind !== 'extended' && outcome.kind !== 'held') return null;
  const n = outcome.state.current;
  return n === 7 || n === 30 || n === 100 ? n : null;
}

/**
 * Build a state from days she has already lived (21 §1, "endowed progress").
 *
 * Without this, everyone who has been using the app sees nothing on Home until
 * they write one more entry — their real history invisible, the count starting
 * at zero underneath a week of filled dots. A counter that visibly ignores what
 * she has already done is worse than no counter: it reads as the app not
 * noticing.
 *
 * Runs once, only when nothing has been counted yet, so it can never overwrite
 * a live count. `days` may arrive in any order and may contain duplicates.
 */
export function seedFromHistory(days: string[], today: string): StreakState {
  const unique = Array.from(new Set(days)).sort().reverse();
  const base = emptyStreak(today);
  if (unique.length === 0) return base;

  // The current run only survives if it reaches today or yesterday; anything
  // older is a run that has already ended.
  const gapToNow = daysBetween(unique[0]!, today);
  const runIsLive = gapToNow !== null && gapToNow >= 0 && gapToNow <= 1;

  let current = 0;
  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  // Walk oldest → newest so consecutive days accumulate.
  for (const day of [...unique].reverse()) {
    const gap = previous === null ? null : daysBetween(previous, day);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  if (runIsLive) current = run;

  return {
    ...base,
    current,
    longest,
    lastCountedDay: unique[0]!,
    countedDays: unique.slice(0, HISTORY_DAYS),
  };
}
