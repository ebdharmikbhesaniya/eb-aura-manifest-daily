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
});
