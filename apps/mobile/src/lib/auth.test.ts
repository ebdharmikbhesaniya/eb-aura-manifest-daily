import type { Session } from '@supabase/supabase-js';

import { ensureSession } from './auth';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));

const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const session = { user: { id: 'user-1' } } as Session;

/**
 * `ensureSession` (03 §2.1, reversed 2026-07-27).
 *
 * The app requires a real identity (email or Google) before it will run, so boot
 * no longer creates a session. This only READS the stored one: a returning user
 * has it in secure storage; a first launch has none, and the boot gate sends her
 * to the sign-in wall rather than minting an anonymous user underneath her.
 */
describe('ensureSession', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns the stored session when one exists', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session }, error: null } as never);

    await expect(ensureSession()).resolves.toBe(session);
  });

  it('returns null when there is no session — never signs in anonymously', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);

    await expect(ensureSession()).resolves.toBeNull();
    // The whole point of the reversal: no session is minted here. The mock has
    // no `signInAnonymously` at all, so any attempt to call one would throw.
    expect(mockAuth).not.toHaveProperty('signInAnonymously');
  });

  /**
   * "No stored session" and "could not verify the stored one" both arrive as a
   * null session, and conflating them is what showed the sign-in wall to a
   * signed-in user whose token refresh had failed — indistinguishable, to her,
   * from being silently signed out and losing everything she has written.
   *
   * A refresh failure must reach useBoot's catch as a boot failure instead, so
   * she gets the honest "I can't reach you right now" line and the stored
   * session survives to the next launch.
   */
  it('throws rather than reporting "no session" when the refresh failed', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Network request failed' },
    } as never);

    await expect(ensureSession()).rejects.toThrow('Network request failed');
  });
});
