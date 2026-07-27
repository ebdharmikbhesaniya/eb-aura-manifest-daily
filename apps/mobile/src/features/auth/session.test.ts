import { authenticateWithProvider, sendSignInLink } from './session';

/**
 * `authenticateWithProvider` (03 §2.2, reversed 2026-07-27).
 *
 * With anonymous sessions gone, there is no anonymous user to LINK a Google
 * identity onto, so this is now adopt-only: it signs in AS the Google account
 * directly. Local device state is wiped on success, exactly as the email
 * sign-in path does — there is nothing on this device worth keeping, because
 * nothing is written before login.
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { linkIdentity: jest.fn(), signInWithIdToken: jest.fn(), signInWithOtp: jest.fn() },
  },
}));
jest.mock('@/lib/accountReset', () => ({ wipeDeviceState: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { capture: jest.fn() } }));

const { supabase } = jest.requireMock('@/lib/supabase') as {
  supabase: {
    auth: { linkIdentity: jest.Mock; signInWithIdToken: jest.Mock; signInWithOtp: jest.Mock };
  };
};
const mockLinkIdentity = supabase.auth.linkIdentity;
const mockSignInWithIdToken = supabase.auth.signInWithIdToken;
const mockSignInWithOtp = supabase.auth.signInWithOtp;
const { wipeDeviceState } = jest.requireMock('@/lib/accountReset') as {
  wipeDeviceState: jest.Mock;
};
const { analytics } = jest.requireMock('@/lib/analytics') as { analytics: { capture: jest.Mock } };

beforeEach(() => jest.clearAllMocks());

describe('authenticateWithProvider', () => {
  it('signs in AS the Google account and wipes local state — never tries to link', async () => {
    mockSignInWithIdToken.mockResolvedValue({ error: null });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'signed_in' });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'id-token' });
    // No anonymous user exists to link onto — linking must not be attempted.
    expect(mockLinkIdentity).not.toHaveBeenCalled();
    expect(wipeDeviceState).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('account_signed_in', { method: 'google' });
  });

  it('fails without wiping when the token is rejected', async () => {
    mockSignInWithIdToken.mockResolvedValue({ error: { message: 'bad token' } });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'failed' });
    expect(wipeDeviceState).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('carries the apple method through the same adopt path', async () => {
    mockSignInWithIdToken.mockResolvedValue({ error: null });

    await authenticateWithProvider('apple', 'apple-token');

    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-token' });
    expect(analytics.capture).toHaveBeenCalledWith('account_signed_in', { method: 'apple' });
  });
});

describe('sendSignInLink', () => {
  it('sends the magic link back to the app, not the Site URL', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    await sendSignInLink('her@example.com');

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'her@example.com',
      // shouldCreateUser stays false; emailRedirectTo is the new part (03 §2.1).
      options: { shouldCreateUser: false, emailRedirectTo: 'aura://auth/callback' },
    });
  });
});
