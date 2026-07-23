import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, EASE, FADE_RISE_DISTANCE } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations } from '@/theme/tokens';
import { clampedFontScale, scaledType } from '@/theme/typography';

/** The earliest line settles here — present, already receding (v4 §generating). */
const MIN_SETTLED_OPACITY = 0.45;

export interface RitualLineProps {
  text: string;
  /** Milliseconds to wait before this line arrives. */
  delayMs: number;
  /**
   * 0–1 position in the sequence. Later lines land brighter and the last one
   * lands full-ink (v4 §generating) — the stagger reads as the voice
   * approaching, each line nearer than the one before.
   */
  prominence?: number;
  testID?: string;
}

/**
 * One line of the generation ritual, fading and rising into place (product 13
 * §catalog: fade + 8px rise), spoken in the voice's italic serif.
 *
 * Lines never leave once they arrive — they accumulate, so the screen fills
 * with what Aura is saying rather than flashing one message at a time. That
 * accumulation is the anticipation (product 08 §2: the wait IS the ritual).
 *
 * Under Reduce Motion the rise is dropped and only the fade remains: the line
 * still materializes on cue, it just does not travel.
 */
export function RitualLine({ text, delayMs, prominence = 1, testID }: RitualLineProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const progress = useSharedValue(0);

  const settledOpacity = MIN_SETTLED_OPACITY + (1 - MIN_SETTLED_OPACITY) * prominence;

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: Math.round(durations.fadeRise * motion.scale), easing: EASE }),
    );
  }, [delayMs, motion.scale, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value * settledOpacity,
    transform: motion.reduceMotion
      ? []
      : [{ translateY: (1 - progress.value) * FADE_RISE_DISTANCE }],
  }));

  const scale = clampedFontScale();

  return (
    <Animated.Text
      testID={testID}
      accessibilityRole="text"
      allowFontScaling={false}
      style={[
        style,
        // The nearest line is a size up: v4 lets it carry the moment while the
        // ones behind it recede in both weight and scale.
        scaledType(prominence < 1 ? 'ritualLine' : 'ritualLineFinal', scale),
        {
          textAlign: 'center',
          // Only the final, nearest line speaks in full ink.
          color: prominence < 1 ? colors.text.secondary : colors.text.primary,
          marginTop: spacing.md,
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}
