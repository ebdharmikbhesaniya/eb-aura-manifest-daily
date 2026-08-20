/**
 * The daily count on Home (21 §4, technical 19).
 *
 * Read `voice.ts` before touching this file. `GUILT_VOCABULARY` bans the word
 * "streak" outright, along with "you missed" and "don't lose" — so none of them
 * can appear here, and the copy lint fails CI if they do. That is not an
 * obstacle to work around; it is the reason this surface reads the way it does.
 *
 * Two lines carry the whole design:
 *
 *  - `held` — when a day is missed and grace covers it. It states the fact and
 *    removes the sting, and it never names a failure. She learns her place was
 *    kept, not that she slipped.
 *  - `reset` — the gentlest line in the app, shown at the moment the count goes
 *    back to one. It says the past still happened, because it did, and because
 *    a number that erases her work is the mechanic product 16 spent the whole
 *    product arguing against.
 *
 * "days becoming" rather than a count of days done: progress here is identity,
 * not score (16 §Milestone system).
 */
export const streakCopy = {
  /** Follows the number: "12 days becoming". */
  label: 'days becoming',
  /** Day one would otherwise read "1 days becoming". */
  labelOne: 'day becoming',
  /** Day one reads as an invitation, never as a loss that just happened. */
  dayOne: 'Day one. Again is allowed.',
  /** Shown only once the best run exceeds the current one. */
  longest: 'Longest yet: {n}',
  /** Grace consumed. No apology asked for, none offered. */
  held: 'Yesterday stayed open. I kept your place.',
  /** The reset line. `{n}` is her longest run, which survives (19 §3 rule 7). */
  reset: 'Back to day one. Your {n} days still happened.',

  /** The history sheet — where past runs stay visible. */
  historyTitle: 'Every day you showed up',
  historyHeld: 'Kept for you',
  historyEmpty: 'This is where your days will gather.',
  close: 'Close',

  /**
   * Milestones. These accompany the D7/D30/D100 letters that already exist
   * (06) rather than replacing them with a badge.
   */
  milestone7: 'Seven days. There’s a letter for that.',
  milestone30: 'Thirty days. Look who you are becoming.',
  milestone100: 'A hundred days.',
} as const;
