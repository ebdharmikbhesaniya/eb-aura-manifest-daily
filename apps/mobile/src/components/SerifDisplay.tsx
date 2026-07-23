import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface SerifDisplayProps {
  variant: 'letterLine' | 'affirmationHero' | 'momentTitle' | 'title' | 'sheetTitle';
  children: ReactNode;
  /**
   * Draw the closing mark in ember — v4 puts it on every screen title.
   *
   * On by default for `title` and `sheetTitle`, off everywhere else: a letter
   * line or a moment name is prose, and prose does not wear a brand mark. Opt
   * out for a title that is DATA rather than a heading (a collection's name),
   * or for a sheet heading that is already a question to her.
   */
  emberMark?: boolean;
  /** Some sheets centre their heading over an orb (v4 §locked feature). */
  center?: boolean;
}

/** Splits a heading's closing mark off so it can be coloured separately. */
function splitMark(children: ReactNode): { body: ReactNode; mark: string } | null {
  if (typeof children !== 'string') return null;

  const trimmed = children.trimEnd();
  if (trimmed === '') return null;

  return /[.!?]$/.test(trimmed)
    ? { body: trimmed.slice(0, -1), mark: trimmed.slice(-1) }
    : { body: trimmed, mark: '.' };
}

/**
 * The serif surfaces — letters, affirmations, moment titles. Typography is the
 * hero here (product 12 §principles), so these are the only sizes that get a
 * Dynamic Type clamp.
 *
 * The clamp is applied by hand rather than by RN: `allowFontScaling` only turns
 * scaling fully on or off, and neither is acceptable. Off would ignore her
 * accessibility setting; on would let a Letter line hit 3× and reflow to two
 * words per screen, destroying the karaoke rhythm the whole wow depends on
 * (product 08). So we multiply by the clamped scale ourselves and then set
 * `allowFontScaling={false}` — otherwise RN would scale the already-scaled size
 * a second time.
 */
export function SerifDisplay({
  variant,
  children,
  emberMark = variant === 'title' || variant === 'sheetTitle',
  center = false,
}: SerifDisplayProps) {
  const { colors, typography } = useTheme();
  const { fontSize, lineHeight, ...rest } = typography[variant];
  const scale = clampedFontScale();

  const split = emberMark ? splitMark(children) : null;

  return (
    <Text
      allowFontScaling={false}
      // The brand mark is decoration, so it must not reach the spoken label —
      // VoiceOver should read the heading, not "Maya period".
      {...(split && typeof children === 'string' ? { accessibilityLabel: children } : {})}
      style={[
        rest,
        { color: colors.text.primary },
        center && { textAlign: 'center' as const },
        ...(fontSize !== undefined ? [{ fontSize: fontSize * scale }] : []),
        ...(lineHeight !== undefined ? [{ lineHeight: lineHeight * scale }] : []),
      ]}
    >
      {split ? (
        <>
          {split.body}
          <Text style={{ color: colors.accent.ember }}>{split.mark}</Text>
        </>
      ) : (
        children
      )}
    </Text>
  );
}
