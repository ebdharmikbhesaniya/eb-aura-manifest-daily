import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * A06 — obstacle (merged from the Aura design). The design's radio rows,
 * recolored. Single choice; the readable LABEL persists to `struggle` (free
 * text the memory seed and the Letter read), so it submits the label, not a slug.
 */
export function A06Obstacle() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { submit, existingValue } = useConversation('a06-obstacle');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="a06-obstacle"
      screenId="a06-obstacle"
      question={onboardingCopy.a06Obstacle.question}
      helper={onboardingCopy.a06Obstacle.helper}
      primaryTitle={onboardingCopy.a06Obstacle.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {onboardingCopy.a06Obstacle.choices.map((label) => {
          const on = selected === label;
          return (
            <Pressable
              key={label}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSelected(label)}
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
