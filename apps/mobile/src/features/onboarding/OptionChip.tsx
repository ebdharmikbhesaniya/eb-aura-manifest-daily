import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

export interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * `select` (default) — a pick: selected turns the hairline ink on white.
   * `block` — an off-limits pick: selected strikes the word through and fades
   * it, because choosing it means "not this".
   */
  variant?: 'select' | 'block';
  testID?: string;
}

/** The v5 pill chip — pronouns (select) and the off-limits words/topics (block). */
export function OptionChip({
  label,
  selected,
  onPress,
  variant = 'select',
  testID,
}: OptionChipProps) {
  const { colors, radii, spacing } = useTheme();
  const block = variant === 'block';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: block ? spacing.sm + 1 : spacing.sm + 3,
        paddingHorizontal: block ? spacing.md + 3 : spacing.md + 5,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: selected
          ? block
            ? colors.accent.oliveFaint
            : colors.text.primary
          : colors.surface.border,
        backgroundColor: selected
          ? block
            ? colors.surface.divider
            : colors.surface.card
          : colors.surface.cardGlassy,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: block ? 14 : 14.5,
          color: selected && block ? colors.text.disabled : colors.text.primary,
          textDecorationLine: selected && block ? 'line-through' : 'none',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
