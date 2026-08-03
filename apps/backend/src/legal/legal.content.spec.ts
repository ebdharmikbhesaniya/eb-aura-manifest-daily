import { PRIVACY } from './legal.content';

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
