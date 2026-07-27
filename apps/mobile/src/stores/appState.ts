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
   * Bumped by `reset` to re-run the boot sequence.
   *
   * `useBoot`'s effect keys on this. Without it `reset` put the app back to
   * `booting` and nothing ever ran again — the effect's other dependencies are
   * stable store actions, so it never re-fired and the boot gate held on its
   * blank holding view forever. Sign-in and sign-out both re-run boot through
   * this: sign-in to pick up the new session, sign-out to fall to the wall.
   */
  bootNonce: number;
  setReady: (userId: string) => void;
  /** No stored session — boot found nothing, so she meets the sign-in wall. */
  setUnauthenticated: () => void;
  setFailed: () => void;
  reset: () => void;
}

export const useAppState = create<AppState>((set) => ({
  status: 'booting',
  userId: null,
  bootNonce: 0,
  setReady: (userId) => set({ status: 'ready', userId }),
  setUnauthenticated: () => set({ status: 'unauthenticated', userId: null }),
  setFailed: () => set({ status: 'failed', userId: null }),
  reset: () =>
    set((state) => ({ status: 'booting', userId: null, bootNonce: state.bootNonce + 1 })),
}));
