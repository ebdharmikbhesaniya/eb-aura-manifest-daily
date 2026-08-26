import { nextScreen, previousScreen, visibleQuestionScreens, QUESTION_SCREENS } from './flow';

describe('flow navigation with experiment-hidden screens', () => {
  it('advances one screen when nothing is hidden (shipped flow)', () => {
    expect(nextScreen('a04-goals')).toBe('a05-feeling');
    expect(nextScreen('a08-ritual-time')).toBe('a10-commitment');
  });

  it('skips a hidden screen forward (onboarding-dream-home=off)', () => {
    const hidden = new Set(['s07-dream-home'] as const);
    // s05-work-feeling → (skip s07) → a08-ritual-time
    expect(nextScreen('s05-work-feeling', hidden)).toBe('a08-ritual-time');
  });

  it('skips a hidden screen backward, symmetrically', () => {
    const hidden = new Set(['s07-dream-home'] as const);
    // a08-ritual-time → (skip s07) → s05-work-feeling
    expect(previousScreen('a08-ritual-time', hidden)).toBe('s05-work-feeling');
  });

  it('skips the commit beat when onboarding-commit-beat=off', () => {
    const hidden = new Set(['a10-commitment'] as const);
    // a08 → (skip a10) → a11-affirmation
    expect(nextScreen('a08-ritual-time', hidden)).toBe('a11-affirmation');
    expect(previousScreen('a11-affirmation', hidden)).toBe('a08-ritual-time');
  });

  it('drops a hidden question from the progress denominator, but not a non-question screen', () => {
    // s07-dream-home is a question screen → hiding it shrinks the count.
    expect(visibleQuestionScreens(new Set(['s07-dream-home'] as const)).length).toBe(
      QUESTION_SCREENS.length - 1,
    );
    // a10-commitment carries no answer → not in QUESTION_SCREENS → count unchanged.
    expect(visibleQuestionScreens(new Set(['a10-commitment'] as const)).length).toBe(
      QUESTION_SCREENS.length,
    );
  });

  it('returns null past the ends regardless of hidden set', () => {
    expect(nextScreen('s12-notifications')).toBeNull();
    expect(previousScreen('a01-splash')).toBeNull();
  });
});
