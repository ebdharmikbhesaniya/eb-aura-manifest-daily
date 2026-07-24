import { create } from 'zustand';

/**
 * Boot state (05 §2: client state in Zustand, small stores, no server data).
 *
 * `booting → ready | failed`. There is no `error` UI state here on purpose —
 * `failed` carries no code, and the screen renders one in-voice line (05 §8).
 */
export type BootStatus = 'booting' | 'ready' | 'failed';

interface AppState {
  status: BootStatus;
  userId: string | null;
  /**
   * Bumped by `reset` to re-run the boot sequence.
   *
   * `useBoot`'s effect keys on this. Without it `reset` put the app back to
   * `booting` and nothing ever ran again — the effect's other dependencies are
   * stable store actions, so it never re-fired and the boot gate held on its
   * blank holding view forever. Signing out needs a fresh anonymous session
   * right after, so it needs this.
   */
  bootNonce: number;
  setReady: (userId: string) => void;
  setFailed: () => void;
  reset: () => void;
}

export const useAppState = create<AppState>((set) => ({
  status: 'booting',
  userId: null,
  bootNonce: 0,
  setReady: (userId) => set({ status: 'ready', userId }),
  setFailed: () => set({ status: 'failed', userId: null }),
  reset: () =>
    set((state) => ({ status: 'booting', userId: null, bootNonce: state.bootNonce + 1 })),
}));
