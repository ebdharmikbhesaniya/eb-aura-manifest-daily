import { renderHook, waitFor } from '@testing-library/react-native';
import type { Session } from '@supabase/supabase-js';

import { useAppState } from '@/stores/appState';

import { useBoot } from './useBoot';

/**
 * `useBoot` (05 §9, reversed 2026-07-27).
 *
 * Boot reads the stored session and does one of two things: run the app for a
 * real user, or — when there is none — fall into the `unauthenticated` state so
 * the gate shows the sign-in wall. RevenueCat and analytics identify must NOT
 * run without a session: there is no id to bind them to yet.
 */

// Mocks live inside the factories (jest.mock is hoisted above any const, so a
// referenced outer const would be read before it is initialized).
jest.mock('@/lib/auth', () => ({
  ensureSession: jest.fn(),
  identifyForObservability: jest.fn(),
}));
jest.mock('@/features/paywall/purchases', () => ({
  configurePurchases: jest.fn(async () => undefined),
}));
jest.mock('@/features/letter/audioCache', () => ({ sweepAudioCache: jest.fn() }));
jest.mock('@/lib/appOpen', () => ({ emitAppOpen: jest.fn() }));
jest.mock('@/lib/analytics', () => ({
  initAnalytics: jest.fn(),
  analytics: { register: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));
jest.mock('@/lib/superProperties', () => ({ buildSuperProperties: jest.fn(() => ({})) }));

const { ensureSession } = jest.requireMock('@/lib/auth') as { ensureSession: jest.Mock };
const { configurePurchases } = jest.requireMock('@/features/paywall/purchases') as {
  configurePurchases: jest.Mock;
};
const { analytics } = jest.requireMock('@/lib/analytics') as {
  analytics: { identify: jest.Mock };
};

const session = { user: { id: 'user-1' } } as Session;

beforeEach(() => {
  jest.clearAllMocks();
  useAppState.setState({ status: 'booting', userId: null, bootNonce: 0 });
});

describe('useBoot', () => {
  it('falls into unauthenticated when there is no session — no RevenueCat, no identify', async () => {
    ensureSession.mockResolvedValue(null);

    renderHook(() => useBoot());

    await waitFor(() => expect(useAppState.getState().status).toBe('unauthenticated'));
    expect(useAppState.getState().userId).toBeNull();
    expect(configurePurchases).not.toHaveBeenCalled();
    expect(analytics.identify).not.toHaveBeenCalled();
  });

  it('boots a returning user straight in when a session exists', async () => {
    ensureSession.mockResolvedValue(session);

    renderHook(() => useBoot());

    await waitFor(() => expect(useAppState.getState().status).toBe('ready'));
    expect(useAppState.getState().userId).toBe('user-1');
    expect(configurePurchases).toHaveBeenCalledWith('user-1');
    expect(analytics.identify).toHaveBeenCalledWith('user-1');
  });
});
