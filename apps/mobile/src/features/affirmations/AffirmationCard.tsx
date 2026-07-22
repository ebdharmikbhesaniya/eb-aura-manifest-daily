import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Label, SerifDisplay } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface AffirmationCardProps {
  text: string;
  whyLine?: string | null;
  technique?: keyof typeof affirmationsCopy.techniques | null;
  /** "July 22" — computed by the screen so the card stays a pure layout. */
  dateLabel?: string;
  /** Hidden until she reveals it — the small ceremony product 09 §9.3a asks for. */
  revealed: boolean;
  onReveal?: () => void;
  onTechnique?: () => void;
  testID?: string;
}

/**
 * The affirmation card (product 09 §9.3a), on the v4 parchment surface —
 * `accent.parchment` is the affirmation colour and nothing else's.
 *
 * Reveal is a deliberate beat, not a loading state: the card exists, and she
 * chooses when to read it. That tiny act of consent is what separates "here is
 * your content" from "here is something meant for you".
 *
 * `forwardRef` so the share renderer can capture exactly this view (§9.3
 * share-as-image) rather than rebuilding a second, drifting layout.
 */
export const AffirmationCard = forwardRef<View, AffirmationCardProps>(function AffirmationCard(
  { text, whyLine, technique, dateLabel, revealed, onReveal, onTechnique, testID },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const parchment = { backgroundColor: colors.accent.parchment };

  // "TODAY · JULY 22" and the heart — the v4 card header, on both states.
  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <Label>
        {dateLabel ? `${affirmationsCopy.todayLabel} · ${dateLabel}` : affirmationsCopy.todayLabel}
      </Label>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        allowFontScaling={false}
        style={[scaledType('body', scale), { color: colors.accent.heart }]}
      >
        ♥
      </Text>
    </View>
  );

  if (!revealed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={affirmationsCopy.reveal}
        onPress={onReveal}
        testID={testID ? `${testID}-reveal` : 'affirmation-reveal'}
      >
        <Card variant="solid" style={parchment}>
          {header}
          <Text
            allowFontScaling={false}
            style={[
              scaledType('body', scale),
              { marginTop: spacing.lg, color: colors.text.secondary, textAlign: 'center' },
            ]}
          >
            {affirmationsCopy.reveal}
          </Text>
        </Card>
      </Pressable>
    );
  }

  return (
    <View ref={ref} collapsable={false} testID={testID}>
      <Card variant="solid" style={parchment}>
        {header}

        <View style={{ marginTop: spacing.md }}>
          <SerifDisplay variant="affirmationHero">{text}</SerifDisplay>
        </View>

        {whyLine && (
          <Text
            testID="affirmation-why"
            allowFontScaling={false}
            style={[
              scaledType('bodySmall', scale),
              { marginTop: spacing.md, color: colors.text.secondary },
            ]}
          >
            {whyLine}
          </Text>
        )}

        {technique && (
          // The technique chip is the education wedge (product 09 §9.3c) — it
          // opens an explanation rather than decorating the card.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={affirmationsCopy.techniques[technique].label}
            onPress={onTechnique}
            testID="affirmation-technique"
            style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
          >
            <Text style={[scaledType('bodySmall', scale), { color: colors.cta.link }]}>
              {affirmationsCopy.techniques[technique].label}
            </Text>
          </Pressable>
        )}
      </Card>
    </View>
  );
});
