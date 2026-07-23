import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /**
   * Fill the field with the page colour instead of card white (v4 §gratitude).
   *
   * For a field that sits INSIDE a white card, where white-on-white leaves
   * nothing to aim at — the composer on Gratitude is the case v4 draws.
   */
  sunken?: boolean;
  /**
   * Gentle inline copy under the field. This is the ONLY feedback channel by
   * design: product 12 bans harsh validation reds — "never harsh validation
   * reds; gentle inline copy instead" — so there is no error colour prop at
   * all. Guidance arrives in the companion's voice, not as an alarm.
   */
  hint?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  /**
   * Passed through for the few fields where the OS keyboard genuinely differs —
   * an email field with a QWERTY keyboard and autocapitalisation is a small
   * cruelty. Kept to these two rather than spreading all of TextInput's props,
   * so the component stays a design-system piece rather than a thin wrapper.
   */
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  testID?: string;
}

/**
 * Text input (v3 §inputs): borderless on the card surface, body-size text,
 * soft olive focus glow. The glow is an overlay so focus never shifts
 * layout — the field breathes awake rather than snapping a border on.
 */
export function Input({
  value,
  onChangeText,
  placeholder,
  hint,
  multiline = false,
  autoFocus = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  testID,
  sunken = false,
}: InputProps) {
  const { colors, durations, radii, shadows, spacing, typography } = useTheme();
  const motion = useMotion();
  const glow = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const animateGlow = (focused: boolean) => {
    const target = focused ? 1 : 0;
    // Same 150ms tempo as the chip acknowledgment — one response language
    // app-wide. Under Reduce Motion the glow simply appears.
    glow.value = motion.reduceMotion
      ? target
      : withTiming(target, {
          duration: Math.round(durations.chipSelect * motion.scale),
          easing: EASE,
        });
  };

  return (
    <View>
      <View>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => animateGlow(true)}
          onBlur={() => animateGlow(false)}
          placeholderTextColor={colors.text.secondary}
          {...(placeholder !== undefined && { placeholder })}
          style={[
            typography.body,
            {
              // v4 §gratitude sinks the field into the page colour so it reads
              // as somewhere to write rather than another white card.
              backgroundColor: sunken ? colors.bg.base : colors.surface.card,
              borderRadius: radii.field,
              padding: spacing.md,
              color: colors.text.primary,
            },
            multiline && { textAlignVertical: 'top' },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              ...shadows.focusGlow,
              borderRadius: radii.field,
              borderWidth: 1,
              borderColor: colors.accent.olive,
              shadowColor: colors.accent.olive,
            },
            glowStyle,
          ]}
        />
      </View>
      {hint !== undefined && (
        <Text
          style={[typography.bodySmall, { color: colors.text.secondary, marginTop: spacing.xs }]}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
