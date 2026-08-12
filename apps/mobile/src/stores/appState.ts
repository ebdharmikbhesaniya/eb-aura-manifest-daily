import { create } from 'zustand';

/**
 * Boot state (05 §2: client state in Zustand, small stores, no server data).
 *
 * `booting → ready | failed`. There is no `error` UI state here on purpose —
 * `failed` carries no code, and the screen renders one in-voice line (05 §8).
 */
export type BootStatus = 'booting' | 'ready' | 'unauthenticated' | 'failed';

interface AppState {
  status: BootStatus;
  userId: string | null;
  /**
   * Why boot failed, for DEVELOPMENT eyes only.
   *
   * The `failed` screen deliberately carries no code (05 §8), and that stays
   * true in every shipped build — this is read only behind `__DEV__`. It exists
   * because the boot catch used to discard the error entirely, which made a
   * device-only boot failure impossible to diagnose: the phone showed one
   * in-voice line and the cause was gone.
   */
  bootError: string | null;
  /** RevenueCat premium snapshot, captured at boot (a trial counts as premium). */
  premium: boolean;
  /**
   * Whether RevenueCat has a key on this build — i.e. the hard paywall is
   * enforceable. When false (no key), the gate must let everyone through rather
   * than brick the launch (12 §2).
   */
  purchasesConfigured: boolean;
  /**
   * Bumped by `reset` to re-run the boot sequence.
   *
   * `useBoot`'s effect keys on this. Without it `reset` put the app back to
   * `booting` and nothing ever ran again — the effect's other dependencies are
   * stable store actions, so it never re-fired and the boot gate held on its
   * blank holding view forever. Sign-in and sign-out both re-run boot through
   * this: sign-in to pick up the new session, sign-out to fall to the wall.
   */
  bootNonce: number;
  setReady: (userId: string, premium?: boolean, purchasesConfigured?: boolean) => void;
  /** No stored session — boot found nothing, so she meets the sign-in wall. */
  setUnauthenticated: () => void;
  setFailed: (reason?: string) => void;
  reset: () => void;
}

export const useAppState = create<AppState>((set) => ({
  status: 'booting',
  userId: null,
  premium: false,
  purchasesConfigured: false,
  bootError: null,
  bootNonce: 0,
  setReady: (userId, premium = false, purchasesConfigured = false) =>
    set({ status: 'ready', userId, premium, purchasesConfigured, bootError: null }),
  setUnauthenticated: () =>
    set({
      status: 'unauthenticated',
      userId: null,
      premium: false,
      purchasesConfigured: false,
      bootError: null,
    }),
  setFailed: (reason) =>
    set({
      status: 'failed',
      userId: null,
      premium: false,
      purchasesConfigured: false,
      bootError: reason ?? null,
    }),
  reset: () =>
    set((state) => ({
      status: 'booting',
      userId: null,
      premium: false,
      purchasesConfigured: false,
      bootError: null,
      bootNonce: state.bootNonce + 1,
    })),
}));
