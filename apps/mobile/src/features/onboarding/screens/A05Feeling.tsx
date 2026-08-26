import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * A05 — feeling (merged from the Aura design). The design's radio rows, recolored
 * to Ember & Bone. Single choice; the KEY persists to `profiles.feeling`, where
 * 'anxious' / 'stuck' are the gentle-content router's triggers (safety, 03 §5).
 */
export function A05Feeling() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { submit, existingValue } = useConversation('a05-feeling');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="a05-feeling"
      screenId="a05-feeling"
      question={onboardingCopy.a05Feeling.question}
      helper={onboardingCopy.a05Feeling.helper}
      primaryTitle={onboardingCopy.a05Feeling.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {Object.entries(onboardingCopy.a05Feeling.choices).map(([value, label]) => {
          const on = selected === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSelected(value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md + 2,
                borderRadius: radii.card,
                backgroundColor: on ? colors.surface.card : colors.surface.cardGlassy,
                borderWidth: on ? 2 : 1.5,
                borderColor: on ? colors.cta.background : colors.surface.border,
                ...(on ? shadows.card : null),
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: on ? colors.cta.background : colors.text.label,
                  backgroundColor: on ? colors.cta.background : 'transparent',
                }}
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.sansMedium,
                  fontSize: 16,
                  color: colors.text.primary,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ConversationScreen>
  );
}
