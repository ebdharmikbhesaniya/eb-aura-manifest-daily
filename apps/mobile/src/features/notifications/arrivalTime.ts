/**
 * Her arrival time, as a person writes it.
 *
 * `profiles.arrival_time` is a Postgres `time`, so what comes back over PostgREST
 * is `"08:00:00"` even though onboarding stored `"08:00"`. That seconds field was
 * reaching the surface verbatim — the permission sheet asked to find her at
 * "08:00:00", which reads like a machine talking (05 §8: no technical strings).
 *
 * Kept deliberately dumb: this trims a known column format, it does not parse or
 * localize. A value that is not `HH:MM[:SS]` is passed through untouched rather
 * than guessed at.
 */
const HH_MM_SS = /^(\d{2}:\d{2})(:\d{2})?$/;

export function formatArrivalTime(raw: string | null | undefined, fallback = '07:00'): string {
  if (!raw) return fallback;
  return HH_MM_SS.exec(raw.trim())?.[1] ?? raw;
}
