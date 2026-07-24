import { queryClient } from '@/lib/queryClient';
import { kv, STORAGE_KEYS } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { signOutAndWipeDevice, wipeDeviceState } from './accountReset';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: jest.fn(async () => ({ error: null })) } },
}));

const signOut = supabase.auth.signOut as jest.Mock;

/**
 * The local half of "delete means delete" (03 §5 step 5, 14 §6).
 *
 * These assertions exist because every one of them was FALSE in shipped code:
 * account deletion called the endpoint and routed to onboarding while still
 * holding the session, the MMKV draft and a warm query cache — so the next
 * conversation resumed at the screen she had been parked on, carrying her old
 * answers into a brand-new account.
 */
describe('signOutAndWipeDevice (03 §5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
    kv.clearAll();
    useAppState.setState({ status: 'ready', userId: 'user-1', bootNonce: 0 });
  });

  it('drops the session', async () => {
    await signOutAndWipeDevice();

    expect(signOut).toHaveBeenCalled();
  });

  it('wipes MMKV, so the next conversation starts at the beginning', async () => {
    kv.set(STORAGE_KEYS.letterSeen, true);
    kv.set(STORAGE_KEYS.gratitudeEntries, [{ date: '2026-07-24', entry: 'a line' }]);

    await signOutAndWipeDevice();

    expect(kv.get(STORAGE_KEYS.letterSeen)).toBeUndefined();
    expect(kv.get(STORAGE_KEYS.gratitudeEntries)).toBeUndefined();
  });

  it('resets the onboarding draft the persist middleware holds in memory', async () => {
    useOnboardingDraft.getState().advanceTo('s05-work-feeling');
    useOnboardingDraft.getState().setAnswer('s03-name', 'Maya');

    await signOutAndWipeDevice();

    // Clearing the MMKV key alone would not do this — zustand keeps its own
    // copy and writes it straight back on the next mutation.
    expect(useOnboardingDraft.getState().currentScreen).toBe('s01-welcome');
    expect(useOnboardingDraft.getState().answers).toEqual({});
  });

  it('re-arms the boot gate so a fresh anonymous session is minted', async () => {
    await signOutAndWipeDevice();

    expect(useAppState.getState().status).toBe('booting');
    expect(useAppState.getState().userId).toBeNull();
    // useBoot keys its effect on the nonce; without the bump it never re-runs
    // and the gate holds on a blank screen forever.
    expect(useAppState.getState().bootNonce).toBe(1);
  });

  it('still wipes when sign-out rejects — a deleted user has no valid token', async () => {
    signOut.mockRejectedValue(new Error('user not found'));
    kv.set(STORAGE_KEYS.letterSeen, true);

    await signOutAndWipeDevice();

    expect(kv.get(STORAGE_KEYS.letterSeen)).toBeUndefined();
  });
});

describe('wipeDeviceState (the signing-IN half, 03 §2.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    kv.clearAll();
    useAppState.setState({ status: 'ready', userId: 'user-1', bootNonce: 0 });
  });

  it('leaves the session alone — she has just authenticated as someone else', () => {
    wipeDeviceState();

    expect(signOut).not.toHaveBeenCalled();
  });

  it('drops the previous account’s cached server data', () => {
    queryClient.setQueryData(['moments'], [{ id: 'm1' }]);

    wipeDeviceState();

    expect(queryClient.getQueryData(['moments'])).toBeUndefined();
  });
});
