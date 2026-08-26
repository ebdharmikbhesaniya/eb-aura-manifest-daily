import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

export interface AnswerRowProps {
  label: string;
  /** A quiet reason under the label (arrival hints). */
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** An optional leading tile (e.g. an icon). */
  leading?: ReactNode;
  /**
   * `check` (default) shows a ✓ when selected; `chevron` shows a › always — for a
   * disclosure row like "Pick a time".
   */
  trailing?: 'check' | 'chevron';
  testID?: string;
}

/**
 * The Onboarding Redesign's one answer control: a full-width list row, used for
 * every choice question (work-feeling, values, dream-home, arrival) so the flow
 * reads as one pattern rather than four. Selected = ink fill + cream text + ✓;
 * unselected = white surface + olive hairline. All Ember & Bone tokens.
 */
export function AnswerRow({
  label,
  subtitle,
  selected,
  onPress,
  leading,
  trailing = 'check',
  testID,
}: AnswerRowProps) {
  const { colors, spacing, radii } = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole={trailing === 'chevron' ? 'button' : 'radio'}
      accessibilityState={trailing === 'chevron' ? undefined : { selected }}
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.md + 4,
        borderRadius: radii.card,
        backgroundColor: selected ? colors.cta.background : colors.surface.card,
        borderWidth: selected ? 0 : 1,
        borderColor: colors.surface.border,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            fontFamily: fonts.sansMedium,
            fontSize: 15,
            lineHeight: 21,
            color: selected ? colors.text.onCta : colors.text.body,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: 13,
              lineHeight: 18,
              color: selected ? 'rgba(245,242,232,0.7)' : colors.text.secondary,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing === 'chevron' ? (
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.text.label }}>
          ›
        </Text>
      ) : selected ? (
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text.onCta }}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}
