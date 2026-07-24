import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The root path belongs to the boot gate, and to nothing else.
 *
 * Expo Router groups are path-transparent: `app/(onboarding)/index.tsx` does not
 * live at `/(onboarding)` — it IS `/`. When it did, the onboarding entry was the
 * app's initial route, and its unconditional `<Redirect>` raced the boot gate and
 * won. The observed effect was that the sign-in wall never appeared: the gate
 * correctly resolved `/(auth)/sign-in`, replaced to it, and was immediately
 * overridden by the redirect already in flight.
 *
 * That also quietly broke every `router.replace('/')` that means "let the gate
 * decide" — sign-in's own `proceed`, the auth callback, settings sign-out — each
 * of which landed in the conversation instead.
 *
 * This is a layout invariant, not a logic one, so no unit test of `resolveBootRoute`
 * can catch it: that function was right the whole time.
 */
const appDir = join(__dirname, '..', '..', 'app');

describe('the root route', () => {
  it('is owned by a real `app/index.tsx`, so the gate decides `/`', () => {
    expect(existsSync(join(appDir, 'index.tsx'))).toBe(true);
  });

  it('is not squatted by the onboarding group entry', () => {
    // `(onboarding)` contributes nothing to the URL, so an index.tsx inside it
    // collides with `/` and steals the first frame from the boot gate.
    expect(existsSync(join(appDir, '(onboarding)', 'index.tsx'))).toBe(false);
  });

  it('still exposes an onboarding entry to resume into', () => {
    expect(existsSync(join(appDir, '(onboarding)', 'resume.tsx'))).toBe(true);
  });
});
