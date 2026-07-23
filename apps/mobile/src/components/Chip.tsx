import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Selectable pill — the onboarding and refine vocabulary (product 12).
 *
 * The tint is the CTA ink rather than a soft pastel wash: a wash would leave
 * near-invisible text in one of the two schemes. "Selected = high-contrast
 * fill" (v3 §chips) holds contrast in both worlds.
 */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // Scale 0.97 for 150ms is a press ACKNOWLEDGMENT (product 13 §catalog), not
      // a state: tying it to `selected` would leave every chosen chip permanently
      // shrunken. The lasting signal of selection is the fill tint below.
      onPressIn={() => {
        scale.value = chipSelectScale(true, motion);
      }}
      onPressOut={() => {
        scale.value = chipSelectScale(false, motion);
      }}
    >
      <Animated.View
        style={[
          {
            borderRadius: radii.chip,
            paddingHorizontal: spacing.md + 2,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: selected ? colors.cta.background : colors.surface.border,
            backgroundColor: selected ? colors.cta.background : colors.surface.card,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={[typography.chipLabel, { color: selected ? colors.text.onCta : colors.text.body }]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
