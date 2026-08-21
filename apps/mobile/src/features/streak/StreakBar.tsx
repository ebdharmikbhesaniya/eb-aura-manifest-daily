import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { EASE, useMotion, type MotionSettings } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

import type { DayMark } from './streak';

/** Same 200ms as the gratitude dot: "quiet completion; no fireworks" (13 §catalog). */
const FILL_MS = 200;

export interface StreakBarProps {
  /** Oldest day first, as `monthFrom` returns it. */
  days: DayMark[];
  height?: number;
}

/**
 * A month of days as one bar (21 §B1).
 *
 * This replaced a seven-segment ring, and the reason is worth keeping: a ring
 * reads as a bounded goal — Apple Watch activity, where full means done — but a
 * count has no completion, so the ring implied "seven days and you are
 * finished" and a part-filled one looked like a spinner. A week-long bar had
 * the same fault in a different shape: it capped the story at seven, so day 18
 * and day 4 drew identically.
 *
 * Thirty days is long enough to show her actual rhythm — the run, the gaps, the
 * days grace kept — without pretending there is a finish line.
 */
function Segment({
  mark,
  motion,
  height,
}: {
  mark: DayMark;
  motion: MotionSettings;
  height: number;
}) {
  const { colors } = useTheme();
  const fill = useSharedValue(mark === 'none' ? 0 : 1);

  useEffect(() => {
    const target = mark === 'none' ? 0 : 1;
    fill.value = motion.reduceMotion
      ? target
      : withTiming(target, { duration: Math.round(FILL_MS * motion.scale), easing: EASE });
  }, [mark, fill, motion]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  // A kept day is pale ember, NOT the empty colour. That difference is the
  // whole anti-shame signal — "I kept your place" has to be visible as
  // something other than a gap.
  const colour = mark === 'held' ? colors.accent.emberSoft : colors.accent.ember;

  return (
    <View
      style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: colors.surface.border }}
    >
      <Animated.View
        style={[{ flex: 1, borderRadius: height / 2, backgroundColor: colour }, fillStyle]}
      />
    </View>
  );
}

export function StreakBar({ days, height = 10 }: StreakBarProps) {
  const motion = useMotion();
  const { spacing } = useTheme();

  return (
    <View
      style={{ flexDirection: 'row', gap: spacing.xs / 2 }}
      // The bar is a summary of the count stated beside it; a screen reader
      // reading thirty segments would be noise.
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {days.map((mark, i) => (
        <Segment key={i} mark={mark} motion={motion} height={height} />
      ))}
    </View>
  );
}
