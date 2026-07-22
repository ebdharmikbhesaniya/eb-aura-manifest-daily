/**
 * The full player and the mini-player (product 09 §9.1, 10 §4, v4 §player).
 *
 * Split out of `moments.ts` so the player owns its own strings: the v4 cover
 * renamed the visible controls (the refine entry is now a quiet "Refine" pill,
 * the transport skips read "−15"/"+15") while the accessibility labels stay the
 * spoken sentences they always were. The copy lint audits every string here.
 */
export const playerCopy = {
  /** Header label over the cover — the category's signature wayfinding. */
  coverLabel: 'Today’s moment',

  /**
   * Under the title when the orb is the cover (no karaoke lines).
   * `{minutes}` comes from the track's real duration.
   */
  fromLine: 'From your future self · {minutes} min',

  /** The mini-player's single line. `{remaining}` is m:ss still to play. */
  miniLine: '{title} · {remaining} left',

  play: 'Play',
  pause: 'Pause',

  /** Spoken labels for the ±15s skips; the pills show the short glyphs. */
  back15: 'Back 15 seconds',
  forward15: 'Forward 15 seconds',
  back15Short: '−15',
  forward15Short: '+15',

  favorite: 'Keep this',
  unfavorite: 'Kept',

  readMode: 'Read',
  listenMode: 'Listen',

  /** Premium, one per moment — the pill is quiet, never a nag (product 09 §9.1). */
  refine: 'Refine',

  minimize: 'Minimize',
} as const;
