import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { getGoogleIdToken, googleAuthAvailable } from '@/features/auth/google';
import { authenticateWithProvider } from '@/features/auth/session';
import { appleAuthAvailable } from '@/features/paywall/claim';

// The route itself lives under `app/`, but its test must NOT: expo-router
// bundles every file in that directory via require.context, which dragged
// @testing-library (a Node-only package) into the app bundle and broke the
// build with `Unable to resolve module console`.
import SignInRoute from '../../../app/(auth)/sign-in';

import * as AppleAuthentication from 'expo-apple-authentication';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/features/auth/google', () => ({
  googleAuthAvailable: jest.fn(() => true),
  getGoogleIdToken: jest.fn(),
}));
jest.mock('@/features/auth/session', () => ({
  authenticateWithProvider: jest.fn(),
  sendSignInLink: jest.fn(async () => ({ sent: true })),
}));
jest.mock('@/features/auth/password', () => ({
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
}));
jest.mock('@/features/paywall/claim', () => ({
  appleAuthAvailable: jest.fn(async () => true),
}));
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { EMAIL: 'EMAIL' },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

/** A promise resolved by hand, so an auth call can be held mid-flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Both provider buttons mount only once the async availability checks settle. */
async function renderGate() {
  await render(<SignInRoute />, { wrapper });
  await waitFor(() => expect(screen.getByTestId('auth-apple')).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  (googleAuthAvailable as jest.Mock).mockReturnValue(true);
  (appleAuthAvailable as jest.Mock).mockResolvedValue(true);
  // Every test releases its gate at the end; without a default the exchange
  // resolves `undefined` and the handler throws while unmounting.
  (authenticateWithProvider as jest.Mock).mockResolvedValue({ status: 'signed_in' });
});

describe('sign-in gate — per-provider loading', () => {
  it('spins ONLY Google while a Google sign-in is in flight', async () => {
    const gate = deferred<{ status: 'ok'; idToken: string }>();
    (getGoogleIdToken as jest.Mock).mockReturnValue(gate.promise);

    await renderGate();
    fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-google').props.accessibilityState.busy).toBe(true);
    });
    // The bug this locks: a single shared `busy` flag spun BOTH buttons.
    expect(screen.getByTestId('auth-apple').props.accessibilityState.busy).toBe(false);

    gate.resolve({ status: 'ok', idToken: 't' });
  });

  it('spins ONLY Apple while an Apple sign-in is in flight', async () => {
    const gate = deferred<{ identityToken: string }>();
    (AppleAuthentication.signInAsync as jest.Mock).mockReturnValue(gate.promise);

    await renderGate();
    fireEvent.press(screen.getByTestId('auth-apple'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-apple').props.accessibilityState.busy).toBe(true);
    });
    expect(screen.getByTestId('auth-google').props.accessibilityState.busy).toBe(false);

    gate.resolve({ identityToken: 't' });
  });

  it('disables the idle provider so a second tap cannot race the first', async () => {
    const gate = deferred<{ status: 'ok'; idToken: string }>();
    (getGoogleIdToken as jest.Mock).mockReturnValue(gate.promise);

    await renderGate();
    fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-apple').props.accessibilityState.disabled).toBe(true);
    });
    // Pressing the idle provider must not start a competing auth attempt.
    fireEvent.press(screen.getByTestId('auth-apple'));
    expect(AppleAuthentication.signInAsync).not.toHaveBeenCalled();

    gate.resolve({ status: 'ok', idToken: 't' });
  });

  it('clears the spinner and re-enables both when a provider call fails', async () => {
    (getGoogleIdToken as jest.Mock).mockResolvedValue({ status: 'failed', unexpected: true });

    await renderGate();
    fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-google').props.accessibilityState.busy).toBe(false);
    });
    expect(screen.getByTestId('auth-apple').props.accessibilityState.disabled).toBe(false);
    expect(authenticateWithProvider).not.toHaveBeenCalled();
  });
});
