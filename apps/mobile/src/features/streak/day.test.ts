import { dayCounts, daysBetween, localDay, monthOf } from './day';

const none = { momentCompleted: false, gratitudeWritten: false, practiceCompleted: false };

describe('dayCounts', () => {
  it('does not count a day where she did nothing', () => {
    expect(dayCounts(none)).toBe(false);
  });

  /** Generous by design (21 §4.1) — showing up, not a checklist. */
  it.each(['momentCompleted', 'gratitudeWritten', 'practiceCompleted'] as const)(
    'counts the day on %s alone',
    (signal) => {
      expect(dayCounts({ ...none, [signal]: true })).toBe(true);
    },
  );
});

describe('localDay', () => {
  /**
   * Local, not UTC. A UTC rollover would tick at 5:30am in India — marking a
   * day done she has not lived, then missed while she sleeps.
   */
  it('reads the local calendar date, not the UTC one', () => {
    // 2026-08-20 23:30 local, whatever the runner's zone.
    const local = new Date(2026, 7, 20, 23, 30);

    expect(localDay(local)).toBe('2026-08-20');
  });

  it('zero-pads single-digit months and days', () => {
    expect(localDay(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('daysBetween', () => {
  it('counts consecutive days as one', () => {
    expect(daysBetween('2026-08-19', '2026-08-20')).toBe(1);
  });

  it('counts across a month boundary', () => {
    expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1);
  });

  it('counts across a leap day', () => {
    expect(daysBetween('2028-02-28', '2028-02-29')).toBe(1);
  });

  it('is negative when the second day is earlier', () => {
    expect(daysBetween('2026-08-20', '2026-08-19')).toBe(-1);
  });

  it('returns null for an unparseable day rather than NaN', () => {
    expect(daysBetween('not-a-date', '2026-08-20')).toBeNull();
  });
});

describe('monthOf', () => {
  it('takes the YYYY-MM the day belongs to', () => {
    expect(monthOf('2026-08-20')).toBe('2026-08');
  });
});
