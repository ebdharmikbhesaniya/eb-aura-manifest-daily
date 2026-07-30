import { UNEXPECTED_CANCEL_THRESHOLD, isUnexpectedCancel } from './cancelStreak';

/**
 * The rule that decides whether a Google "cancel" is her decision or a broken
 * flow (see `cancelStreak.ts` for why the SDK cannot tell us).
 *
 * What these tests protect is a UX promise in both directions: a single cancel
 * must stay silent, and a repeated one must NOT. Getting the first wrong nags
 * someone who simply changed her mind; getting the second wrong is how a
 * configuration bug hides for a whole debugging session.
 */
describe('isUnexpectedCancel', () => {
  it('stays silent on the first cancel — she changed her mind, and that is fine', () => {
    expect(isUnexpectedCancel(1)).toBe(false);
  });

  it('surfaces the second consecutive cancel — nobody cancels twice in a row on purpose', () => {
    expect(isUnexpectedCancel(2)).toBe(true);
  });

  it('keeps surfacing beyond the threshold rather than only firing once', () => {
    expect(isUnexpectedCancel(3)).toBe(true);
    expect(isUnexpectedCancel(9)).toBe(true);
  });

  it('treats a reset streak as silent again, so one success clears the suspicion', () => {
    expect(isUnexpectedCancel(0)).toBe(false);
  });

  it('is driven by the exported threshold, not a hard-coded 2', () => {
    expect(isUnexpectedCancel(UNEXPECTED_CANCEL_THRESHOLD)).toBe(true);
    expect(isUnexpectedCancel(UNEXPECTED_CANCEL_THRESHOLD - 1)).toBe(false);
  });
});
