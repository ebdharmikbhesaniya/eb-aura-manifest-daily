import { Text, View } from 'react-native';

import { Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/** Design 26: a 112pt breathing orb above the invitation. */
const ORB_SIZE = 112;

export interface HandoffScreenProps {
  /** Her name, for the invitation; null keeps it nameless. */
  name: string | null;
  /** True when the onboarding gratitude entry was saved — "1 of 4" is then a fact. */
  gratitudeSaved: boolean;
  onStart: () => void;
  testID?: string;
}

/**
 * The first ritual hand-off (design v5 step 26). Identical for paid and free:
 * the paywall is behind her either way, and Day 1 starts now, while she is
 * here. The "1 of 4" chip only appears when her gratitude entry really was
 * saved during onboarding — it is a count, never a claim.
 */
export function HandoffScreen({ name, gratitudeSaved, onStart, testID }: HandoffScreenProps) {
  const { colors, radii, spacing } = useTheme();
  const c = paywallCopy.v5.handoff;

  return (
    <Screen {...(testID ? { testID } : {})}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.lg + 4,
          paddingHorizontal: spacing.sm,
        }}
      >
        <Orb state="idle" size={ORB_SIZE} />
        <SerifDisplay variant="display" center>
          {c.title.replace('{name}', name ? `, ${name}` : '')}
        </SerifDisplay>
        {gratitudeSaved && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 1 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.text.secondary }}>
              {c.saved}
            </Text>
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 12,
                color: colors.accent.emberDeep,
                backgroundColor: colors.accent.parchment,
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: radii.chip - 5,
                overflow: 'hidden',
              }}
            >
              {c.progress}
            </Text>
          </View>
        )}
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton title={c.cta} onPress={onStart} testID="handoff-start" />
      </View>
    </Screen>
  );
}
