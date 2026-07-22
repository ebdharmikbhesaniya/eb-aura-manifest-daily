import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

/** V4 typing dots are 7pt — between spacing.xs and sm; no token fits. */
const DOT_SIZE = 7;
/** The trough of the pulse — matches the v4 keyframe's resting opacity. */
const RESTING_OPACITY = 0.25;

function Dot({ index }: { index: number }) {
  const { colors, durations, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const opacity = useSharedValue(RESTING_OPACITY);

  useEffect(() => {
    if (reduceMotion) {
      // Still dots, softly present — "Aura is composing" without the pulse.
      opacity.value = withTiming(RESTING_OPACITY, { duration: durations.reveal });
      return;
    }

    // Staggered breath: each dot lags the last by one chip-beat, so the three
    // read as a wave rather than a blink.
    opacity.value = withDelay(
      index * durations.chipSelect,
      withRepeat(withTiming(1, { duration: durations.orbGlow, easing: EASE }), -1, true),
    );

    return () => cancelAnimation(opacity);
  }, [index, reduceMotion, opacity, durations]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: radii.pill,
          backgroundColor: colors.text.label,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * The typing indicator (v4 S2 + reflection beats): three small dots pulsing in
 * sequence. Pure presence — hidden from screen readers; the pause itself is
 * what carries meaning there.
 */
export function TypingDots({ testID }: { testID?: string }) {
  const { spacing } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
    >
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} />
      ))}
    </View>
  );
}
