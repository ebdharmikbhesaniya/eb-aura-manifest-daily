import { authRedirectUrl } from './redirect';

/**
 * The deep link Supabase sends every email link back to (03 §2.1).
 *
 * Without it, confirmation and magic links fall back to the project's Site URL
 * (a dev default of http://localhost:3000) and dead-end in a browser instead of
 * opening the app. This is the one URL all three email flows must carry.
 */
describe('authRedirectUrl', () => {
  it('points at the app callback route', () => {
    expect(authRedirectUrl()).toBe('aura://auth/callback');
  });
});
