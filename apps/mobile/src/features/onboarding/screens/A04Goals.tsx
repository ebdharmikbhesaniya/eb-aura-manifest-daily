import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** ≤2 to match the `values` column's DB check (02 §1); a04 reuses that column. */
const MAX_GOALS = 2;

/**
 * A04 — goals (merged from the Aura design). The design's icon-card grid, kept
 * as-is and recolored to Ember & Bone: selection is an ink border (our card
 * vocabulary), not the design's gold. Answers persist to `values`.
 */
export function A04Goals() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { submit, existingValue } = useConversation('a04-goals');
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(existingValue) ? (existingValue as string[]) : [],
  );

  const toggle = (label: string) => {
    setSelected((current) => {
      if (current.includes(label)) return current.filter((v) => v !== label);
      // At the cap, a new pick replaces the oldest — friendlier than a dead tap.
      if (current.length >= MAX_GOALS) return [...current.slice(1), label];
      return [...current, label];
    });
  };

  return (
    <ConversationScreen
      testID="a04-goals"
      screenId="a04-goals"
      question={onboardingCopy.a04Goals.question}
      helper={onboardingCopy.a04Goals.helper}
      primaryTitle={onboardingCopy.a04Goals.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected.length === 0}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {onboardingCopy.a04Goals.choices.map((choice) => {
          const on = selected.includes(choice.label);
          return (
            <Pressable
              key={choice.label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={choice.label}
              onPress={() => toggle(choice.label)}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radii.card,
                backgroundColor: on ? colors.surface.card : colors.surface.cardGlassy,
                borderWidth: on ? 2 : 1.5,
                borderColor: on ? colors.cta.background : colors.surface.border,
                ...(on ? shadows.card : null),
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radii.chip,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.accent.emberFaint : colors.surface.divider,
                }}
              >
                <Text style={{ fontSize: 19, color: on ? colors.accent.emberDeep : colors.text.label }}>
                  {choice.icon}
                </Text>
              </View>
              <Text
                style={{ fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.text.primary }}
              >
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ConversationScreen>
  );
}
