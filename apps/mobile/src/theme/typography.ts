import { PixelRatio, Platform, type TextStyle } from 'react-native';

/**
 * Typography (Aura Design v3 "Ember & Bone"). "Typography is the hero" —
 * affirmations and letters ARE the product, so type gets the budget.
 *
 * Serif when it matters: Newsreader carries display, titles and the voice
 * (the future self speaks in serif, always — italic, ember). Figtree carries
 * the interface.
 */

export const fonts = {
  /** Bundled via @expo-google-fonts/newsreader. Display, titles, moment names. */
  serif: 'Newsreader_500Medium',
  /** The voice — only when the future self speaks. */
  serifItalic: 'Newsreader_500Medium_Italic',
  serifSemiBold: 'Newsreader_600SemiBold',
  /** Bundled via @expo-google-fonts/figtree. All interface text. */
  sans: 'Figtree_400Regular',
  sansMedium: 'Figtree_500Medium',
  sansSemiBold: 'Figtree_600SemiBold',
  sansBold: 'Figtree_700Bold',
  /**
   * v4 sets row metadata — durations, counts — in ui-monospace so a column of
   * times aligns. Nothing is bundled for it; these are the system faces.
   */
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

/**
 * Dynamic Type clamps.
 *
 * All text scales (product 12), but the serif surfaces clamp: a Letter line at
 * 3× would reflow to two words per screen and destroy the karaoke rhythm the
 * whole wow depends on (product 08). UI sans text is left to scale freely —
 * it has no such constraint, and clamping it would be an accessibility failure.
 */
export const FONT_SCALE_CLAMP = { min: 0.85, max: 1.4 } as const;

/** Above this, chips reflow to lists (05 §4, product 12). */
export const CHIP_REFLOW_FONT_SCALE = 1.3;

/** Clamped scale for serif display surfaces. `getFontScale` is injectable for tests. */
export function clampedFontScale(getFontScale: () => number = PixelRatio.getFontScale): number {
  const scale = getFontScale();
  return Math.min(FONT_SCALE_CLAMP.max, Math.max(FONT_SCALE_CLAMP.min, scale));
}

/** True when chips should render as a vertical list instead (Dynamic Type reflow). */
export function shouldReflowChips(getFontScale: () => number = PixelRatio.getFontScale): boolean {
  return getFontScale() > CHIP_REFLOW_FONT_SCALE;
}

type Variant =
  | 'display'
  | 'letterLine'
  | 'affirmationHero'
  | 'momentTitle'
  | 'title'
  | 'sheetTitle'
  | 'headline'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'button'
  | 'cardChip'
  | 'cardButton'
  | 'rowTitle'
  | 'rowMeta';

/**
 * `allowFontScaling` is left ON everywhere (RN default). Serif variants apply
 * their own clamp at render time via `clampedFontScale`.
 */
export const typography: Record<Variant, TextStyle> = {
  /** Hero statements — Newsreader 500 · 34/40 · -1% (v3 display). */
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.34 },

  /** The voice — italic serif, generous leading for karaoke (v3 voice · 22/38). */
  letterLine: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 22,
    lineHeight: 38,
  },
  /**
   * Affirmation display — the voice at full size.
   *
   * v4's card sets it at 24/1.5 rather than v3's 30/45: the card gained chips
   * and a pair of actions, and the old size pushed all of it off the surface.
   */
  affirmationHero: {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
    fontSize: 24,
    lineHeight: 36,
  },
  /**
   * Upright serif — moment names are titles, not speech (v3: italic = voice
   * only). v4 sets the card's at 21/1.3.
   */
  momentTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 27 },
  /**
   * Every screen's own title — the greeting, "Affirmations", her name on
   * Profile. v4 sets all eight of them at 27/1.2, up from v3's 24/30.
   */
  title: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 32 },
  /** Bottom-sheet and ritual headings — a step below `title`. */
  sheetTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30 },
  /** Emphasised sans rows — plan names, prices (v3 headline · Figtree 700 · 16/22). */
  headline: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22 },

  /** Figtree 400 · 15/24 (v3 body). */
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24 },
  /** Captions — Figtree 500 · 13/19 (v3 caption). */
  bodySmall: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 19 },

  /**
   * The category's signature wayfinding: uppercase, letter-spaced, 11pt
   * ("TODAY'S MOMENT"). Colour comes from `text.label` (olive); opacity is
   * applied by the Label component so the token stays a pure text style.
   */
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  /** Figtree 600 · 15 — weight lives in the font family, never `fontWeight`. */
  button: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20 },

  /**
   * Chips that sit ON a card rather than in a selection row (v4 affirmation
   * card). Smaller and untracked — the tracked, uppercase `label` is wayfinding,
   * these are annotations.
   */
  cardChip: { fontFamily: fonts.sansSemiBold, fontSize: 11.5, lineHeight: 16 },
  /** Paired actions inside a card — a step down from the 15pt primary button. */
  cardButton: { fontFamily: fonts.sansSemiBold, fontSize: 13.5, lineHeight: 18 },

  /**
   * Rows that name a MOMENT (v4 §home "Recently played"). Serif, because a
   * moment's name is a title — the sans `button` face is for controls.
   */
  rowTitle: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20 },
  /** The figure beside it — monospaced so a column of durations lines up. */
  rowMeta: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15 },
};

/** 60% per product 12 §label style. */
export const LABEL_OPACITY = 0.6;

/**
 * A typography variant with its metrics multiplied by a (usually clamped)
 * font scale — for serif surfaces that manage Dynamic Type themselves via
 * `allowFontScaling={false}` + `clampedFontScale()`. Keeping the arithmetic
 * here means no screen ever hardcodes a font size to do its own scaling.
 */
export function scaledType(variant: Variant, scale: number): TextStyle {
  const base = typography[variant];
  const style: TextStyle = { ...base };
  if (base.fontSize !== undefined) style.fontSize = base.fontSize * scale;
  if (base.lineHeight !== undefined) style.lineHeight = base.lineHeight * scale;
  return style;
}
