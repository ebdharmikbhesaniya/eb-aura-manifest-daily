import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface ProfilePlanChipProps {
  label: string;
  /** 'accent' for Premium/Trial; 'neutral' for Free (never reads as an alert). */
  tint: 'accent' | 'neutral';
  onPress: () => void;
}

/**
 * The subscription-status pill beside the name (spec §3). Pure presentation —
 * the caller maps entitlement to label/tint. Neutral Free uses the card surface
 * + border so it reads as a quiet fact, not a warning.
 */
export function ProfilePlanChip({ label, tint, onPress }: ProfilePlanChipProps) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  const accent = tint === 'accent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens your subscription"
      onPress={onPress}
      testID="profile-plan-chip"
      style={({ pressed }) => ({
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: radii.chip,
        backgroundColor: accent ? colors.accent.oliveSoft : colors.surface.card,
        borderWidth: accent ? 0 : 1,
        borderColor: colors.surface.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        style={[
          scaledType('bodySmall', scale),
          { color: accent ? colors.text.primary : colors.text.secondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
