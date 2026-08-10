import { useAppState } from './appState';

/**
 * Boot state machine (05 §2). The new `unauthenticated` status is what the boot
 * gate reads to send a session-less launch to the sign-in wall instead of
 * holding forever on "no profile yet".
 */
describe('appState', () => {
  beforeEach(() => useAppState.setState({ status: 'booting', userId: null, bootNonce: 0 }));

  it('setUnauthenticated moves to the unauthenticated status with no user', () => {
    useAppState.getState().setReady('user-1');

    useAppState.getState().setUnauthenticated();

    expect(useAppState.getState().status).toBe('unauthenticated');
    expect(useAppState.getState().userId).toBeNull();
  });

  it('records the entitlement snapshot passed to setReady', () => {
    useAppState.getState().setReady('user-1', true, true);

    expect(useAppState.getState().premium).toBe(true);
    expect(useAppState.getState().purchasesConfigured).toBe(true);
  });

  it('defaults the snapshot to free when setReady is called with just an id', () => {
    useAppState.getState().setReady('user-1');

    expect(useAppState.getState().premium).toBe(false);
    expect(useAppState.getState().purchasesConfigured).toBe(false);
  });

  it('clears the entitlement snapshot when the session ends', () => {
    useAppState.getState().setReady('user-1', true, true);

    useAppState.getState().reset();

    expect(useAppState.getState().premium).toBe(false);
    expect(useAppState.getState().purchasesConfigured).toBe(false);
  });
});
