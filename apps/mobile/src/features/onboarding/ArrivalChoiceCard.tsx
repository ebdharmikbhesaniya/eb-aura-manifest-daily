import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Card } from '@/components';
import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface ArrivalChoiceCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** The "Pick a time" row: a disclosure, so it trails a chevron instead of the check disc. */
  chevron?: boolean;
  testID?: string;
}

/**
 * An arrival-time choice (v4 S11): white card, 2px ink border when chosen, and
 * a small ink check disc confirming the choice. Same press acknowledgment as
 * every other selectable in the app.
 */
export function ArrivalChoiceCard({
  title,
  subtitle,
  selected,
  onPress,
  chevron = false,
  testID,
}: ArrivalChoiceCardProps) {
  const { colors, iconSizes, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // Press acknowledgment, not state — the lasting signal is the border.
      onPressIn={() => {
        scale.value = chipSelectScale(true, motion);
      }}
      onPressOut={() => {
        scale.value = chipSelectScale(false, motion);
      }}
    >
      <Animated.View style={animatedStyle}>
        <Card
          variant="solid"
          style={{
            // Always present so choosing never shifts layout (SelectCard's rule).
            borderWidth: 2,
            borderColor: selected ? colors.cta.background : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.button, { color: colors.text.primary }]}>{title}</Text>
            {subtitle !== undefined && (
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.text.secondary, marginTop: spacing.xs },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>

          {chevron ? (
            <Text
              accessibilityElementsHidden
              style={[typography.button, { color: colors.text.label }]}
            >
              ›
            </Text>
          ) : (
            selected && (
              <View
                accessibilityElementsHidden
                style={{
                  width: iconSizes.md,
                  height: iconSizes.md,
                  borderRadius: radii.pill,
                  backgroundColor: colors.cta.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    typography.label,
                    { color: colors.text.onCta, letterSpacing: 0, textTransform: 'none' },
                  ]}
                >
                  ✓
                </Text>
              </View>
            )
          )}
        </Card>
      </Animated.View>
    </Pressable>
  );
}
