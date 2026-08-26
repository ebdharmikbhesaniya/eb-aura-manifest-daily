import { Text, View } from 'react-native';

import { Orb, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

const COMMIT_ORB_SIZE = 168;

/**
 * A10 — the micro-commitment beat, as a centred orb moment (matching the S13
 * commit design) rather than a top-aligned question with a small hero. The
 * breathing orb, a quiet eyebrow, the ask, and a soft "Not yet" — both actions
 * advance (the beat is the ask, not a gate). Committing lifts follow-through
 * (Duolingo/Headway); this is the honest version — no coercive hold.
 */
export function A10Commitment() {
  const { colors, spacing, typography } = useTheme();
  const { advance } = useConversation('a10-commitment');
  const c = onboardingCopy.a10Commitment;

  return (
    <Screen testID="a10-commitment">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <Orb state="idle" size={COMMIT_ORB_SIZE} />
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.md }}>
          <Text
            style={[
              typography.label,
              { color: colors.text.label, textAlign: 'center', letterSpacing: 1.2 },
            ]}
          >
            {c.eyebrow}
          </Text>
          <SerifDisplay variant="display" center>
            {c.question}
          </SerifDisplay>
          <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
            {c.helper}
          </Text>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
        <PillButton
          title={c.primary}
          onPress={() => {
            analytics.capture('commitment_accepted', {});
            advance();
          }}
        />
        <TextButton title={c.secondary} onPress={() => advance()} />
      </View>
    </Screen>
  );
}
