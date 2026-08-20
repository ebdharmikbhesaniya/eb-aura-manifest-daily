import { kv, STORAGE_KEYS } from '@/lib/storage';

import { useStreakStore } from './streakStore';

const did = { momentCompleted: false, gratitudeWritten: true, practiceCompleted: false };
const nothing = { momentCompleted: false, gratitudeWritten: false, practiceCompleted: false };

const day = (iso: string) => new Date(`${iso}T12:00:00`);

describe('streakStore', () => {
  beforeEach(() => {
    kv.delete(STORAGE_KEYS.streak);
    useStreakStore.getState().reset();
  });

  it('counts a day and persists it', () => {
    useStreakStore.getState().record(did, day('2026-08-20'));

    expect(useStreakStore.getState().state.current).toBe(1);
    expect(kv.get<{ current: number }>(STORAGE_KEYS.streak)?.current).toBe(1);
  });

  it('does nothing when she did none of the three', () => {
    const outcome = useStreakStore.getState().record(nothing, day('2026-08-20'));

    expect(outcome).toBeNull();
    expect(useStreakStore.getState().state.current).toBe(0);
  });

  /**
   * Gratitude, practice and the player all call `record`. They must be able to
   * fire freely — this is the guarantee that lets them.
   */
  it('is idempotent across the three call sites on one day', () => {
    const store = useStreakStore.getState();
    store.record({ ...nothing, gratitudeWritten: true }, day('2026-08-20'));
    store.record({ ...nothing, practiceCompleted: true }, day('2026-08-20'));
    store.record({ ...nothing, momentCompleted: true }, day('2026-08-20'));

    expect(useStreakStore.getState().state.current).toBe(1);
  });

  it('does not clear a held line when she reopens the app the same day', () => {
    const store = useStreakStore.getState();
    store.record(did, day('2026-08-18'));
    store.record(did, day('2026-08-20')); // one missed day → held

    expect(useStreakStore.getState().lastOutcome).toBe('held');

    useStreakStore.getState().record(did, day('2026-08-20'));

    expect(useStreakStore.getState().lastOutcome).toBe('held');
  });

  it('raises a milestone at seven days and clears it once consumed', () => {
    const store = useStreakStore.getState();
    for (let d = 14; d <= 20; d++) store.record(did, day(`2026-08-${d}`));

    expect(useStreakStore.getState().state.current).toBe(7);
    expect(useStreakStore.getState().pendingMilestone).toBe(7);

    useStreakStore.getState().clearMilestone();

    expect(useStreakStore.getState().pendingMilestone).toBeNull();
  });

  /**
   * Hydration runs once, when the module is first imported — so this has to
   * plant the bad value and then load the store fresh. Asserting against the
   * already-hydrated singleton would pass without ever reaching the code path,
   * which is worse than having no test at all.
   */
  it('discards a corrupt stored value on hydrate rather than crashing Home', () => {
    kv.set(STORAGE_KEYS.streak, { current: 'twelve', longest: null });

    jest.resetModules();
    const fresh = require('./streakStore').useStreakStore as typeof useStreakStore;

    expect(fresh.getState().state.current).toBe(0);
    expect(() => fresh.getState().record(did, day('2026-08-20'))).not.toThrow();
    expect(fresh.getState().state.current).toBe(1);
  });

  it('wipes everything on reset, for account deletion', () => {
    useStreakStore.getState().record(did, day('2026-08-20'));
    useStreakStore.getState().reset();

    expect(useStreakStore.getState().state.current).toBe(0);
    expect(kv.get(STORAGE_KEYS.streak)).toBeUndefined();
  });
});
