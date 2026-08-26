import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * A08 — ritual time (merged from the Aura design). The design's preset rows,
 * recolored. Single choice; the KEY maps to `arrival_time` via ARRIVAL_PRESETS
 * (commit.ts), which also drives the daily notification schedule. Replaces the
 * old s11-arrival-time.
 */
export function A08RitualTime() {
  const { colors, spacing, radii, shadows } = useTheme();
  const { submit, existingValue } = useConversation('a08-ritual-time');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  return (
    <ConversationScreen
      testID="a08-ritual-time"
      screenId="a08-ritual-time"
      question={onboardingCopy.a08RitualTime.question}
      helper={onboardingCopy.a08RitualTime.helper}
      primaryTitle={onboardingCopy.a08RitualTime.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm }}>
        {Object.entries(onboardingCopy.a08RitualTime.choices).map(([value, opt]) => {
          const on = selected === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${opt.label}, ${opt.meta}`}
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
                {opt.label}
              </Text>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text.label }}>
                {opt.meta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ConversationScreen>
  );
}
