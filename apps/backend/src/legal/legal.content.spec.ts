import { PRIVACY, SUPPORT } from './legal.content';

describe('privacy content', () => {
  const text = JSON.stringify(PRIVACY).toLowerCase();

  it('discloses Google Analytics / Ads measurement (spec §6)', () => {
    expect(text).toContain('google analytics');
  });

  it('makes clear ad measurement excludes personal content', () => {
    // The disclosure must reassure that struggles/names/words are not shared.
    expect(text).toContain('personal content');
  });
});

describe('support content', () => {
  const text = JSON.stringify(SUPPORT).toLowerCase();

  /**
   * The page a store reviewer opens. Each of these is something they look for,
   * and each was missing from the app or its metadata at some point.
   */
  it('gives an email address to write to', () => {
    expect(text).toContain('emperorbrains.official@gmail.com');
  });

  it('says how to cancel, since the store is the one billing', () => {
    expect(text).toContain('subscriptions');
    expect(text).toContain('cancel');
  });

  it('says how to restore a purchase after a reinstall', () => {
    expect(text).toContain('restore purchase');
  });

  it('points at account deletion, which the stores require a route to', () => {
    expect(text).toContain('delete account');
  });

  it('carries no effective date — it is not a policy', () => {
    expect(SUPPORT.effectiveDate).toBeUndefined();
  });
});
