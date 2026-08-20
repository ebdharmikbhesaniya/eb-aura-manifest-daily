/**
 * What counts as showing up (21 §4.1).
 *
 * One predicate, three sources, so Home, the milestone letters and the
 * analytics can never disagree about what a day means. Deliberately generous:
 * ANY of the three counts. The ask is that she showed up, not that she
 * completed a checklist — a count that required all three would be the
 * chore-list product 16 argues against, wearing the new feature's clothes.
 */
export interface DaySignals {
  /** Today's moment played to the end. Starting it is not showing up. */
  momentCompleted: boolean;
  /** A gratitude line exists for today. */
  gratitudeWritten: boolean;
  /** A 369 practice block finished. */
  practiceCompleted: boolean;
}

export function dayCounts(signals: DaySignals): boolean {
  return signals.momentCompleted || signals.gratitudeWritten || signals.practiceCompleted;
}

/**
 * Her LOCAL calendar day as `YYYY-MM-DD`.
 *
 * Local, not UTC, and this matters: `weekDots` already reads local days, and a
 * count that rolled over at UTC midnight would tick at 5:30am for a user in
 * India — marking a day done that she has not lived yet, then marking it missed
 * while she sleeps.
 */
export function localDay(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The `YYYY-MM` a day belongs to — the held-day budget resets on this. */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/**
 * Whole days from `from` to `to`, or `null` if either is unparseable.
 *
 * Computed at UTC noon rather than midnight so a DST shift — which moves a day
 * boundary by an hour — cannot round a 1-day gap to 0 or 2.
 */
export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * All-false signals, so a call site can name only the one it is reporting:
 * `record({ ...NO_SIGNALS, gratitudeWritten: true })`. Spreading a shared
 * constant means a fourth signal added here cannot silently default to `true`
 * at a call site that predates it.
 */
export const NO_SIGNALS: DaySignals = {
  momentCompleted: false,
  gratitudeWritten: false,
  practiceCompleted: false,
};
