import { resolveBootRoute, type BootState } from './routeGate';

// Signed in by default so the existing cases still exercise the gate they were
// written for; the sign-in gate has its own block below.
const state = (overrides: Partial<BootState> = {}): BootState => ({
  claimed: true,
  profile: { onboarding_completed_at: '2026-07-17T10:00:00Z' },
  hasLetter: false,
  letterSeen: false,
  paywallSeen: true,
  ...overrides,
});

describe('resolveBootRoute', () => {
  describe('the sign-in gate (founder decision, 2026-07-24)', () => {
    it('sends an account with no identity on it to sign in', () => {
      expect(resolveBootRoute(state({ claimed: false }))).toBe('/(auth)/sign-in');
    });

    it('gates ahead of onboarding — nothing is written before an owner exists', () => {
      expect(
        resolveBootRoute(state({ claimed: false, profile: { onboarding_completed_at: null } })),
      ).toBe('/(auth)/sign-in');
    });

    it('gates ahead of a waiting letter', () => {
      expect(resolveBootRoute(state({ claimed: false, hasLetter: true, letterSeen: false }))).toBe(
        '/(auth)/sign-in',
      );
    });

    it('lets a signed-in user straight through to the rest of the funnel', () => {
      expect(resolveBootRoute(state({ claimed: true }))).toBe('/(tabs)/home');
    });
  });

  it('sends a user who has not finished onboarding to the conversation', () => {
    expect(resolveBootRoute(state({ profile: { onboarding_completed_at: null } }))).toBe(
      '/(onboarding)/resume',
    );
  });

  it('treats an empty-string timestamp as not completed', () => {
    // Defensive: a falsy-but-present value must not skip onboarding, which would
    // drop her into an empty Home with no Letter — the worst possible first run.
    expect(resolveBootRoute(state({ profile: { onboarding_completed_at: '' } }))).toBe(
      '/(onboarding)/resume',
    );
  });

  it('sends a user with no letter yet to Home', () => {
    expect(resolveBootRoute(state({ hasLetter: false }))).toBe('/(tabs)/home');
  });

  describe('the letter gate (06 §3)', () => {
    it('sends her to the Letter when one is waiting and unheard', () => {
      expect(resolveBootRoute(state({ hasLetter: true, letterSeen: false }))).toBe('/letter');
    });

    it('sends her to Home once she has heard it', () => {
      expect(resolveBootRoute(state({ hasLetter: true, letterSeen: true }))).toBe('/(tabs)/home');
    });

    it('never lets a waiting letter skip an unfinished onboarding', () => {
      // A cold start with a letter must not jump the funnel (06 §5).
      expect(
        resolveBootRoute(
          state({ profile: { onboarding_completed_at: null }, hasLetter: true, letterSeen: false }),
        ),
      ).toBe('/(onboarding)/resume');
    });

    it('does not route to the Letter when none exists, however the flag reads', () => {
      expect(resolveBootRoute(state({ hasLetter: false, letterSeen: false }))).toBe('/(tabs)/home');
    });
  });

  describe('the paywall gate (12 §3)', () => {
    const heardTheLetter = { hasLetter: true, letterSeen: true };

    it('presents the paywall once she has heard the letter', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, paywallSeen: false }))).toBe('/paywall');
    });

    it('never presents it a second time — no quieter second offer (product 01 §10)', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, paywallSeen: true }))).toBe(
        '/(tabs)/home',
      );
    });

    it('never shows the paywall BEFORE the letter — the wow is spent first', () => {
      // Product 08's central monetization decision: the letter converts, so it
      // must land before the ask. This ordering is the decision, in code.
      expect(
        resolveBootRoute(state({ hasLetter: true, letterSeen: false, paywallSeen: false })),
      ).toBe('/letter');
    });

    it('never shows the paywall during onboarding (checklist #4)', () => {
      // S10 is a vulnerable disclosure; a paywall anywhere near it is banned.
      expect(
        resolveBootRoute(
          state({
            profile: { onboarding_completed_at: null },
            hasLetter: true,
            letterSeen: false,
            paywallSeen: false,
          }),
        ),
      ).toBe('/(onboarding)/resume');
    });

    it('does not present it to someone who has no letter yet', () => {
      expect(resolveBootRoute(state({ hasLetter: false, paywallSeen: false }))).toBe(
        '/(tabs)/home',
      );
    });
  });
});
