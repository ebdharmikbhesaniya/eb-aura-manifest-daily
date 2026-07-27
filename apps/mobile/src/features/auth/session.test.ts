import { authenticateWithProvider } from './session';

/**
 * `authenticateWithProvider` (03 §2.2/§2.3) — the one path a wrong turn on which
 * silently destroys her data. These tests pin the ORDER: link first (keep the
 * anonymous account and everything keyed to its id), and only sign in as an
 * existing account when the identity is already taken — and only then wipe.
 *
 * The device flow (native Google/Apple sheets, the real Supabase session) is the
 * founder's on-device pass; this guards the branch that decides keep-vs-abandon.
 */

// Mocks defined INSIDE the factory (jest.mock is hoisted above these consts, so
// referencing an outer const here would read it before it is initialized).
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { linkIdentity: jest.fn(), signInWithIdToken: jest.fn() } },
}));
jest.mock('@/lib/accountReset', () => ({ wipeDeviceState: jest.fn() }));
jest.mock('@/lib/analytics', () => ({ analytics: { capture: jest.fn() } }));

const { supabase } = jest.requireMock('@/lib/supabase') as {
  supabase: { auth: { linkIdentity: jest.Mock; signInWithIdToken: jest.Mock } };
};
const mockLinkIdentity = supabase.auth.linkIdentity;
const mockSignInWithIdToken = supabase.auth.signInWithIdToken;
const { wipeDeviceState } = jest.requireMock('@/lib/accountReset') as {
  wipeDeviceState: jest.Mock;
};
const { analytics } = jest.requireMock('@/lib/analytics') as { analytics: { capture: jest.Mock } };

beforeEach(() => jest.clearAllMocks());

describe('authenticateWithProvider (google)', () => {
  it('LINKS to the anonymous account when it can — her data survives, nothing is wiped', async () => {
    mockLinkIdentity.mockResolvedValue({ error: null });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'linked' });
    expect(mockLinkIdentity).toHaveBeenCalledWith({ provider: 'google', token: 'id-token' });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    expect(wipeDeviceState).not.toHaveBeenCalled();
    expect(analytics.capture).toHaveBeenCalledWith('account_claimed', { method: 'google' });
  });

  it('falls back to signing IN as the existing account only when the identity is already taken — and wipes', async () => {
    mockLinkIdentity.mockResolvedValue({ error: { code: 'identity_already_exists' } });
    mockSignInWithIdToken.mockResolvedValue({ error: null });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'signed_in' });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'id-token' });
    expect(wipeDeviceState).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('account_signed_in', { method: 'google' });
  });

  it('does NOT abandon a live conversation on a retryable link error — never signs in, never wipes', async () => {
    // A network blip is not "identity taken". Treating it as such would strand
    // the anonymous account over an error that would have cleared on retry.
    mockLinkIdentity.mockResolvedValue({
      error: { code: 'over_request_rate_limit', message: 'try again' },
    });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'failed' });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    expect(wipeDeviceState).not.toHaveBeenCalled();
  });

  it('reports failure without wiping when the adopt step itself fails', async () => {
    mockLinkIdentity.mockResolvedValue({ error: { code: 'identity_already_exists' } });
    mockSignInWithIdToken.mockResolvedValue({ error: { message: 'bad token' } });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'failed' });
    expect(wipeDeviceState).not.toHaveBeenCalled();
  });

  it('also recognises a message-worded "already linked" as taken', async () => {
    mockLinkIdentity.mockResolvedValue({
      error: { message: 'Identity is already linked to another user' },
    });
    mockSignInWithIdToken.mockResolvedValue({ error: null });

    const outcome = await authenticateWithProvider('google', 'id-token');

    expect(outcome).toEqual({ status: 'signed_in' });
  });

  it('carries the apple method through the same link-first path', async () => {
    mockLinkIdentity.mockResolvedValue({ error: null });

    await authenticateWithProvider('apple', 'apple-token');

    expect(analytics.capture).toHaveBeenCalledWith('account_claimed', { method: 'apple' });
  });
});
