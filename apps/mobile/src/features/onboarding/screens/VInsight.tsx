import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { Eyebrow } from '../Eyebrow';
import { moodOf } from '../flow';
import { useConversation } from '../useConversation';

/** The design's short ember rule above the insight. */
const RULE_WIDTH = 44;

/**
 * VALUE — the insight (reciprocity on the very next screen) or, when she said
 * she has been really struggling, the support beat: short, gentle, and
 * non-blocking, with a way to reach support right there.
 */
export function VInsight() {
  const router = useRouter();
  const { colors, radii, spacing, typography } = useTheme();
  const { advance } = useConversation('v-insight');
  const answers = useOnboardingDraft((s) => s.answers);
  const mood = moodOf(answers);
  const c = onboardingCopy.vInsight;

  if (mood === 'struggling') {
    const s = c.support;
    return (
      <ConversationScreen
        testID="v-insight-support"
        screenId="v-insight"
        center
        primaryTitle={s.primary}
        onPrimary={advance}
      >
        <SerifDisplay variant="question">{s.title}</SerifDisplay>
        <View
          style={{
            marginTop: spacing.md,
            borderRadius: radii.group,
            padding: spacing.lg,
            backgroundColor: colors.accent.parchment,
            borderWidth: 1,
            borderColor: colors.surface.border,
            gap: spacing.sm + 2,
          }}
        >
          <Eyebrow>{s.label}</Eyebrow>
          <Text style={[typography.body, { color: colors.text.body }]}>{s.body}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/settings/support')}
            hitSlop={spacing.sm}
          >
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 14.5,
                color: colors.accent.emberDeep,
                marginTop: spacing.xs,
              }}
            >
              {s.link}
            </Text>
          </Pressable>
        </View>
      </ConversationScreen>
    );
  }

  const insight = mood ? c.byMood[mood] : c.fallback;

  return (
    <ConversationScreen
      testID="v-insight"
      screenId="v-insight"
      center
      primaryTitle={c.primary}
      onPrimary={advance}
    >
      <View
        style={{
          width: RULE_WIDTH,
          height: 1.5,
          backgroundColor: colors.accent.emberDeep,
          marginBottom: spacing.lg,
        }}
      />
      <SerifDisplay variant="question" emberMark={false}>
        {insight}
      </SerifDisplay>
    </ConversationScreen>
  );
}
