import { wipeDeviceState } from '@/lib/accountReset';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

import { signInWithPassword, signUpWithPassword } from './password';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      updateUser: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}));

jest.mock('@/lib/accountReset', () => ({ wipeDeviceState: jest.fn() }));

jest.mock('@/lib/analytics', () => ({ analytics: { capture: jest.fn() } }));

const getUser = supabase.auth.getUser as jest.Mock;
const signUp = supabase.auth.signUp as jest.Mock;
const updateUser = supabase.auth.updateUser as jest.Mock;
const signInPw = supabase.auth.signInWithPassword as jest.Mock;
const capture = analytics.capture as jest.Mock;

const anonymous = { data: { user: { id: 'anon-1', is_anonymous: true } } };

/**
 * Email + password (founder decision, 2026-07-25), which reverses doc 03 §6.
 *
 * The assertions that matter here are the data-safety ones, not the happy path.
 * `session.ts` splits claiming from signing in precisely because getting them
 * the wrong way round silently destroys a user's letters, and a password path
 * that reached for `signUp` on an anonymous user would do exactly that: mint a
 * new id and orphan the conversation already in progress.
 */
describe('signUpWithPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUser.mockResolvedValue(anonymous);
  });

  it('converts the anonymous user in place, so her conversation survives', async () => {
    updateUser.mockResolvedValue({
      data: { user: { id: 'anon-1', email: 'her@example.com' } },
      error: null,
    });

    const outcome = await signUpWithPassword('her@example.com', 'hunter22');

    expect(outcome).toEqual({ status: 'created' });
    expect(updateUser).toHaveBeenCalledWith({
      email: 'her@example.com',
      password: 'hunter22',
    });
    // The whole point: `signUp` would have abandoned the anonymous user.
    expect(signUp).not.toHaveBeenCalled();
  });

  it('never wipes local state when converting — the id did not change', async () => {
    updateUser.mockResolvedValue({
      data: { user: { id: 'anon-1', email: 'her@example.com' } },
      error: null,
    });

    await signUpWithPassword('her@example.com', 'hunter22');

    expect(wipeDeviceState).not.toHaveBeenCalled();
  });

  it('reports a claim, not a sign-in — the id was kept', async () => {
    updateUser.mockResolvedValue({
      data: { user: { id: 'anon-1', email: 'her@example.com' } },
      error: null,
    });

    await signUpWithPassword('her@example.com', 'hunter22');

    expect(capture).toHaveBeenCalledWith('account_claimed', { method: 'password' });
  });

  it('says "confirm your email" rather than claiming she is in', async () => {
    // Confirmation on: the address is pending, so the user is still anonymous.
    updateUser.mockResolvedValue({
      data: { user: { id: 'anon-1', email: undefined } },
      error: null,
    });

    expect(await signUpWithPassword('her@example.com', 'hunter22')).toEqual({
      status: 'confirm_email',
    });
  });

  it('sends her to sign in when the address already has an account', async () => {
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', message: 'Email address already registered' },
    });

    expect(await signUpWithPassword('her@example.com', 'hunter22')).toEqual({
      status: 'email_taken',
    });
  });

  it("passes Supabase's own password policy through rather than inventing one", async () => {
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'weak_password', message: 'Password should be at least 6 characters' },
    });

    expect(await signUpWithPassword('her@example.com', 'x')).toEqual({
      status: 'weak_password',
      reason: 'Password should be at least 6 characters',
    });
  });

  it('uses signUp for someone who is not anonymous', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'real-1', is_anonymous: false } } });
    signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

    expect(await signUpWithPassword('her@example.com', 'hunter22')).toEqual({ status: 'created' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('sends the confirmation link back to the app, not the Site URL', async () => {
    // Without emailRedirectTo the confirm link falls back to the project's Site
    // URL (localhost:3000 by default) and dead-ends in a browser (03 §2.1).
    getUser.mockResolvedValue({ data: { user: { id: 'real-1', is_anonymous: false } } });
    signUp.mockResolvedValue({ data: { session: null }, error: null });

    await signUpWithPassword('her@example.com', 'hunter22');

    expect(signUp).toHaveBeenCalledWith({
      email: 'her@example.com',
      password: 'hunter22',
      options: { emailRedirectTo: 'aura://auth/callback' },
    });
  });

  it('never throws — a network blip is a failure she can retry', async () => {
    updateUser.mockRejectedValue(new Error('offline'));

    expect(await signUpWithPassword('her@example.com', 'hunter22')).toEqual({ status: 'failed' });
  });
});

describe('signInWithPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wipes local state, so the previous account’s words are not rendered', async () => {
    signInPw.mockResolvedValue({ data: { user: { id: 'real-1' } }, error: null });

    expect(await signInWithPassword('her@example.com', 'hunter22')).toEqual({
      status: 'signed_in',
    });
    // She is a different user now; everything local belongs to the one we left.
    expect(wipeDeviceState).toHaveBeenCalled();
  });

  it('does not distinguish a wrong address from a wrong password', async () => {
    signInPw.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });

    expect(await signInWithPassword('her@example.com', 'nope')).toEqual({
      status: 'wrong_credentials',
    });
  });

  it('names an unconfirmed address, which is a different fix', async () => {
    signInPw.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    });

    expect(await signInWithPassword('her@example.com', 'hunter22')).toEqual({
      status: 'unconfirmed',
    });
  });

  it('leaves local state alone when sign-in fails', async () => {
    signInPw.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });

    await signInWithPassword('her@example.com', 'nope');

    expect(wipeDeviceState).not.toHaveBeenCalled();
  });
});
