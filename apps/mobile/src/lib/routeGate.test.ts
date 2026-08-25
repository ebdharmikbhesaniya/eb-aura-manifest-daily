import { resolveBootRoute, type BootState } from './routeGate';

// Signed in by default so the existing cases still exercise the gate they were
// written for; the sign-in gate has its own block below.
const state = (overrides: Partial<BootState> = {}): BootState => ({
  claimed: true,
  profile: { onboarding_completed_at: '2026-07-17T10:00:00Z' },
  hasLetter: false,
  letterSeen: false,
  // Premium by default so the pre-existing "signed-in → Home" cases still assert
  // the gate they were written for; the hard-paywall block below drives the
  // entitlement axis explicitly.
  premium: true,
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

  describe('the hard paywall gate (2026-08-10)', () => {
    const heardTheLetter = { hasLetter: true, letterSeen: true };

    it('walls a non-premium user once she has heard the letter', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, premium: false }))).toBe('/paywall');
    });

    it('lets a premium user (a trial counts) straight to Home', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, premium: true }))).toBe('/(tabs)/home');
    });

    it('walls even when no letter exists — the gate is entitlement, not a letter', () => {
      // A failed first generation must not become a free way in.
      expect(resolveBootRoute(state({ hasLetter: false, premium: false }))).toBe('/paywall');
    });

    /**
     * This used to assert the opposite — that a build without a RevenueCat key
     * skipped the wall. It made the paywall unreachable on exactly the builds
     * where it most needs testing, and it duplicated a decision the paywall
     * route already makes with better information: it knows whether an OFFERING
     * resolved, not merely whether a key exists, and takes its own escape hatch
     * to Home when there is nothing purchasable. Not-bricked is still
     * guaranteed; it is just guaranteed in one place now.
     */
    it('walls regardless of whether this build can enforce it', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, premium: false }))).toBe('/paywall');
    });

    it('never shows the paywall BEFORE the letter — the wow is spent first', () => {
      // Product 08's central monetization decision: the letter converts, so it
      // must land before the ask. This ordering is the decision, in code.
      expect(resolveBootRoute(state({ hasLetter: true, letterSeen: false, premium: false }))).toBe(
        '/letter',
      );
    });

    it('never shows the paywall during onboarding (checklist #4)', () => {
      // S10 is a vulnerable disclosure; a paywall anywhere near it is banned.
      expect(
        resolveBootRoute(
          state({
            profile: { onboarding_completed_at: null },
            premium: false,
          }),
        ),
      ).toBe('/(onboarding)/resume');
    });
  });
});
