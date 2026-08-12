import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * The first-Home welcome/orientation card is shown exactly once (2026-08-10).
 *
 * A one-time, dismissible card on her first landing on Home that names the daily
 * ritual — the equivalent of Glow's post-onboarding tutorial, in Aura's calm
 * register (a card she reads and dismisses, never a coach-mark that traps the
 * screen). Local device state, like `paywallSeen`/`letterSeen`.
 */
export function markFirstRunSeen(): void {
  kv.set(STORAGE_KEYS.firstRunSeen, true);
}

export function hasSeenFirstRun(): boolean {
  return kv.get<boolean>(STORAGE_KEYS.firstRunSeen) === true;
}
