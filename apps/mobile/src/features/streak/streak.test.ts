import { countDay, emptyStreak, heldDaysRemaining, milestoneReached, weekFrom } from './streak';
import type { StreakState } from './streak';

/** A state as if she had counted `current` days ending on `last`. */
function at(current: number, last: string, heldDaysUsed = 0): StreakState {
  return {
    current,
    longest: current,
    lastCountedDay: last,
    heldDaysUsed,
    heldMonth: last.slice(0, 7),
    countedDays: [last],
  };
}

describe('countDay', () => {
  it('starts at one on the very first counted day', () => {
    const out = countDay(emptyStreak('2026-08-20'), '2026-08-20');

    expect(out.kind).toBe('extended');
    expect(out.state.current).toBe(1);
  });

  it('increments on consecutive days', () => {
    const out = countDay(at(4, '2026-08-19'), '2026-08-20');

    expect(out.kind).toBe('extended');
    expect(out.state.current).toBe(5);
  });

  /**
   * Gratitude, practice and the player all call this. They must not have to
   * coordinate, so a second call on the same day is a no-op rather than a
   * double count.
   */
  it('does not double-count the same day', () => {
    const out = countDay(at(5, '2026-08-20'), '2026-08-20');

    expect(out.kind).toBe('unchanged');
    expect(out.state.current).toBe(5);
  });

  it('absorbs one missed day with grace, and the count continues', () => {
    const out = countDay(at(9, '2026-08-18'), '2026-08-20');

    expect(out.kind).toBe('held');
    expect(out.state.current).toBe(10);
    expect(out.state.heldDaysUsed).toBe(1);
  });

  it('resets when a day is missed and the grace budget is gone', () => {
    const out = countDay(at(9, '2026-08-18', 2), '2026-08-20');

    expect(out.kind).toBe('reset');
    expect(out.state.current).toBe(1);
  });

  /**
   * Grace covers a missed day, not a missed week — otherwise two held days
   * could bridge a fortnight and the number would mean nothing.
   */
  it('resets after a long gap even with a full grace budget', () => {
    const out = countDay(at(30, '2026-08-10'), '2026-08-20');

    expect(out.kind).toBe('reset');
    expect(out.state.current).toBe(1);
  });

  it('refills the grace budget in a new calendar month', () => {
    const spent = at(9, '2026-07-31', 2);

    expect(heldDaysRemaining(spent, '2026-08-01')).toBe(2);
  });

  /** The anti-shame guarantee: a reset must never erase her best run. */
  it('keeps the longest run through a reset', () => {
    const out = countDay(at(34, '2026-08-01'), '2026-08-20');

    expect(out.kind).toBe('reset');
    expect(out.state.current).toBe(1);
    expect(out.state.longest).toBe(34);
    if (out.kind === 'reset') expect(out.previous).toBe(34);
  });

  it('ignores a stored day in the future rather than honouring it', () => {
    const out = countDay(at(5, '2026-09-01'), '2026-08-20');

    expect(out.kind).toBe('unchanged');
    expect(out.state.current).toBe(5);
  });

  /** Flying west moves the local day backwards. She must not lose days for it. */
  it('never decrements when the local day goes backwards', () => {
    const out = countDay(at(12, '2026-08-20'), '2026-08-19');

    expect(out.kind).toBe('unchanged');
    expect(out.state.current).toBe(12);
  });

  it('recovers from a corrupt stored day instead of throwing', () => {
    const out = countDay(at(5, 'not-a-date'), '2026-08-20');

    expect(out.kind).toBe('extended');
    expect(out.state.current).toBe(1);
  });

  it('counts across a month boundary as an ordinary consecutive day', () => {
    const out = countDay(at(3, '2026-07-31'), '2026-08-01');

    expect(out.kind).toBe('extended');
    expect(out.state.current).toBe(4);
  });
});

describe('weekFrom', () => {
  /**
   * The ring must reflect days that COUNTED, by any of the three routes.
   * Gratitude's weekDots cannot stand in: a day earned by finishing a moment
   * would render empty, which is a visible lie about her own week.
   */
  it('marks the days that counted, oldest first', () => {
    const state = {
      ...at(3, '2026-08-20'),
      countedDays: ['2026-08-20', '2026-08-19', '2026-08-16'],
    };

    //        14     15     16    17     18     19    20
    expect(weekFrom(state, '2026-08-20')).toEqual([false, false, true, false, false, true, true]);
  });

  it('is all false before she has counted anything', () => {
    expect(weekFrom(emptyStreak('2026-08-20'), '2026-08-20')).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('records each counted day as it happens', () => {
    const first = countDay(emptyStreak('2026-08-19'), '2026-08-19');
    const second = countDay(first.state, '2026-08-20');

    expect(second.state.countedDays).toEqual(['2026-08-20', '2026-08-19']);
  });
});

describe('milestoneReached', () => {
  it.each([7, 30, 100])('fires at day %i', (n) => {
    const out = countDay(at(n - 1, '2026-08-19'), '2026-08-20');

    expect(milestoneReached(out)).toBe(n);
  });

  it('is silent on ordinary days', () => {
    expect(milestoneReached(countDay(at(4, '2026-08-19'), '2026-08-20'))).toBeNull();
  });

  /** Day one after a reset is not an achievement to announce. */
  it('is silent on a reset', () => {
    expect(milestoneReached(countDay(at(9, '2026-08-01'), '2026-08-20'))).toBeNull();
  });
});
