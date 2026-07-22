import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { PillButton } from '@/components';
import { letterCopy } from '@/copy/letter';
import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations } from '@/theme/tokens';
import { clampedFontScale, scaledType } from '@/theme/typography';

/** The last line hangs alone for two seconds before anything else appears (product 08). */
const HANG_MS = 2_000;

export interface LetterEndingProps {
  onContinue: () => void;
  testID?: string;
}

/**
 * What follows the last word (product 08 §when the audio ends, v4 §ending).
 *
 * The two-second hang is the whole design. The letter has just finished saying
 * something intimate — the covenant line still holding the center of the screen
 * — so this arrives quietly underneath it: one plain line, the ink pill, and
 * the kept-line whispered last. The kept-line is a promise, not an upsell: the
 * letter stays hers on the free tier.
 */
export function LetterEnding({ onContinue, testID }: LetterEndingProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withDelay(
      HANG_MS,
      withTiming(1, { duration: Math.round(durations.crossfade * motion.scale), easing: EASE }),
    );
  }, [appear, motion.scale]);

  const style = useAnimatedStyle(() => ({ opacity: appear.value }));
  const scale = clampedFontScale();

  return (
    <Animated.View
      testID={testID}
      style={[style, { alignItems: 'center', paddingHorizontal: spacing.lg }]}
    >
      <Text
        allowFontScaling={false}
        style={[scaledType('body', scale), { textAlign: 'center', color: colors.text.body }]}
      >
        {letterCopy.ending.more}
      </Text>

      <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>
        <PillButton
          title={letterCopy.ending.primary}
          onPress={onContinue}
          testID="letter-continue"
        />
      </View>

      <Text
        allowFontScaling={false}
        style={[
          scaledType('bodySmall', scale),
          { textAlign: 'center', color: colors.text.secondary, marginTop: spacing.md },
        ]}
      >
        {letterCopy.ending.kept}
      </Text>
    </Animated.View>
  );
}
