import { claimWithEmail } from './claim';

/**
 * The email-claim link (03 §2.2). This path is dormant since the anonymous
 * removal (there is no anonymous user left to claim), but it shares the email
 * confirmation mechanism, so it carries the same redirect for uniformity — a
 * confirmation link must open the app, never the Site URL default.
 */
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { updateUser: jest.fn() } } }));
jest.mock('@/lib/analytics', () => ({ analytics: { capture: jest.fn() } }));

const { supabase } = jest.requireMock('@/lib/supabase') as {
  supabase: { auth: { updateUser: jest.Mock } };
};
const updateUser = supabase.auth.updateUser;

beforeEach(() => jest.clearAllMocks());

describe('claimWithEmail', () => {
  it('sends the claim link back to the app, not the Site URL', async () => {
    updateUser.mockResolvedValue({ error: null });

    await claimWithEmail('her@example.com');

    expect(updateUser).toHaveBeenCalledWith(
      { email: 'her@example.com' },
      { emailRedirectTo: 'aura://auth/callback' },
    );
  });
});
