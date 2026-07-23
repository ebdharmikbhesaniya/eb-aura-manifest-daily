/**
 * The raw palette — Aura Design v3 "Ember & Bone". RAW VALUES LIVE ONLY HERE.
 *
 * Feature code must never import from this file — it imports semantic tokens from
 * `./tokens`, which resolve per colour scheme. A hex in a screen is a bug: it
 * cannot respond to dark mode, and it quietly forks the brand.
 *
 * V3 is warm-editorial: bone backgrounds, white cards, an ember gradient
 * reserved for anything that speaks or plays, ink-black pills for action.
 * Ember is earned — it only appears where the app speaks (voice, audio, the
 * letter). Everything else is bone, white and olive.
 */
export const palette = {
  // Bone neutrals — every screen background.
  bone: '#ECE9DF',
  boneDeep: '#E2DECF',
  /** Text and glyphs on ink fills; never a screen background. */
  cream: '#F5F2E8',
  white: '#FFFFFF',

  // Ink — text, CTAs, the FAB. Warm near-black, never pure black.
  ink: '#1B1810',
  inkBody: '#4A4536',
  inkMuted: '#6F6A58',

  // Olive — the quiet workhorse: captions, borders, selected chips.
  olive: '#8A8265',
  oliveSoft: '#DAD5BE',
  /** Row dividers INSIDE a card — a step lighter than the card's own border. */
  divider: '#EFECE0',
  oliveMuted: '#C9C3AC',
  /** Dashed "future" outlines, empty checkboxes. */
  oliveFaint: '#B4AE9C',
  /** Hairline on the player's skip pills — a step softer than oliveFaint. */
  oliveLine: '#C9C3AC',
  oliveDisabledText: '#A39D89',
  oliveDisabledFill: '#E5E1D2',

  // Ember — voice & audio only. The gradient runs emberSoft → ember.
  ember: '#E2682F',
  emberSoft: '#F2A96F',
  /** Links, progress, the voice serif. */
  emberDeep: '#C9531F',
  /** Inactive waveform bars. */
  emberFaint: '#EBD9C4',

  // Blush — marked days, hearts. Warmth without reward mechanics.
  blush: '#F6D3DF',
  blushSoft: '#FBEAF0',
  blushDeep: '#C2537C',
  heart: '#E38FB0',

  /** Affirmation surfaces. */
  parchment: '#F4EBD6',

  /**
   * Errors only (v3 foundations). Muted rust rather than alarm-red: saturated
   * red triggers fight-or-flight, which is the opposite of everything this
   * product is for.
   */
  rust: '#9E2B12',

  black: '#000000',
} as const;

/**
 * Not in the palette, on purpose: saturated red, neon, cold clinical greys,
 * and anything celebratory near vulnerable content. Ember never decorates —
 * if it isn't speaking or playing, it isn't ember.
 */
