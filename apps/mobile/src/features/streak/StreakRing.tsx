import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { EASE, useMotion, type MotionSettings } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

/** Same 200ms as the gratitude dot: "quiet completion; no fireworks" (13 §catalog). */
const SEGMENT_FILL_MS = 200;

const DAYS_IN_WEEK = 7;

export interface StreakRingProps {
  /** One entry per weekday, oldest first — the same shape `weekDots` returns. */
  filled: boolean[];
  size?: number;
  children?: React.ReactNode;
}

/**
 * The week as a ring of seven segments, with the count living inside it.
 *
 * Built from Views and transforms rather than Skia or SVG, deliberately.
 * `@shopify/react-native-skia` is a dependency but is used nowhere in app code,
 * and `react-native-svg` is not installed at all — introducing either for one
 * decorative ring would add a rendering paradigm the rest of the codebase does
 * not use, for a shape seven rotated rectangles already make.
 *
 * Seven segments rather than a continuous sweep because the ring then carries
 * the same information the dots row does. This replaces that row inside the
 * card instead of sitting above a duplicate of itself.
 */
function Segment({
  index,
  filled,
  size,
  motion,
}: {
  index: number;
  filled: boolean;
  size: number;
  motion: MotionSettings;
}) {
  const { colors } = useTheme();
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    const target = filled ? 1 : 0;
    // Under Reduce Motion the segment simply appears, as WeekDots does.
    fill.value = motion.reduceMotion
      ? target
      : withTiming(target, { duration: Math.round(SEGMENT_FILL_MS * motion.scale), easing: EASE });
  }, [filled, fill, motion]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  const thickness = Math.max(3, Math.round(size * 0.045));
  const length = Math.round(size * 0.14);
  const radius = size / 2 - length / 2;
  // Start at the top and run clockwise, so the week reads the way it is written.
  const angle = (index * 360) / DAYS_IN_WEEK;

  const common = {
    position: 'absolute' as const,
    width: thickness,
    height: length,
    borderRadius: thickness / 2,
    left: size / 2 - thickness / 2,
    top: size / 2 - length / 2,
    transform: [{ rotate: `${angle}deg` }, { translateY: -radius }],
  };

  return (
    <>
      <View style={[common, { backgroundColor: colors.surface.border }]} />
      <Animated.View style={[common, { backgroundColor: colors.accent.ember }, fillStyle]} />
    </>
  );
}

export function StreakRing({ filled, size = 88, children }: StreakRingProps) {
  const motion = useMotion();
  const week = Array.from({ length: DAYS_IN_WEEK }, (_, i) => filled[i] ?? false);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/*
        Only the SEGMENTS are decoration. Hiding the whole subtree would take the
        count with it — it is rendered inside the ring — leaving a screen reader
        with a ring and no number.
      */}
      <View
        style={StyleSheet.absoluteFill}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {week.map((isFilled, i) => (
          <Segment key={i} index={i} filled={isFilled} size={size} motion={motion} />
        ))}
      </View>
      {children}
    </View>
  );
}
