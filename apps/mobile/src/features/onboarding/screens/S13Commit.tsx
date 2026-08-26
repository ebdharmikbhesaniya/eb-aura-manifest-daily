import { Text, View } from 'react-native';

import { Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { analytics } from '@/lib/analytics';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

const COMMIT_ORB_SIZE = 168;

/**
 * S13 — the commitment beat (founder decision, 2026-08-10), in the Onboarding
 * Redesign's centred-moment form (2j): the breathing orb, a small eyebrow, and
 * her name read back before the wow. Committing lifts follow-through
 * (Duolingo/Headway) — but this is the honest version: future-self voice, one
 * affirmative, no coercive hold. Carries no answer and draws no progress step;
 * "I'm ready" advances to the notification education screen.
 */
export function S13Commit() {
  const { colors, spacing, typography } = useTheme();
  const { advance } = useConversation('s13-commit');
  const nameValue = useOnboardingDraft((s) => s.answers['s03-name']?.value);
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';

  const c = onboardingCopy.s13Commit;
  const question = name ? c.question.replace('{name}', name) : c.questionNoName;

  return (
    <Screen testID="s13-commit">
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
            {question}
          </SerifDisplay>
          <Text
            style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}
          >
            {c.helper}
          </Text>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton
          title={c.primary}
          onPress={() => {
            analytics.capture('commitment_accepted', {});
            advance();
          }}
        />
      </View>
    </Screen>
  );
}
