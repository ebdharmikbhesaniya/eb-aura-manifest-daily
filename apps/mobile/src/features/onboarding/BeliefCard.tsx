import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

export interface BeliefCardProps {
  /** The statement, quoted in serif. */
  label: string;
  /** The framing it measures ("process, gentle"). */
  tag: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

/** Q9's card: a serif statement she could say out loud, with its framing tag under it. */
export function BeliefCard({ label, tag, selected, onPress, testID }: BeliefCardProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} — ${tag}`}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: spacing.lg,
        borderRadius: radii.group,
        borderWidth: 1,
        borderColor: selected ? colors.text.primary : colors.surface.border,
        backgroundColor: selected ? colors.surface.card : colors.surface.cardGlassy,
        gap: spacing.md,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: fonts.serifSemiBold,
          fontSize: 23,
          lineHeight: 29,
          color: colors.text.primary,
        }}
      >
        {`“${label}”`}
      </Text>
      <Text
        style={{
          fontFamily: fonts.sans,
          fontSize: 11.5,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: selected ? colors.accent.emberDeep : colors.text.label,
        }}
      >
        {tag}
      </Text>
    </Pressable>
  );
}
