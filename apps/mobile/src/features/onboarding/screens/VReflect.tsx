import { useState } from 'react';
import { Text } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { reflectionOf } from '../derive';
import { EditGuardSheet } from '../EditGuardSheet';
import { useConversation } from '../useConversation';

/**
 * Reflect-back — the mirror. Her actual answers read back in two sentences,
 * with the parts that came from her lit ember. "That's right" moves on;
 * "Not quite" opens the edit-guard — revise the one answer that's off, never
 * restart (product 07), which is the design's restart done the app's way.
 */
export function VReflect() {
  const { colors, spacing } = useTheme();
  const { advance } = useConversation('v-reflect');
  const answers = useOnboardingDraft((s) => s.answers);
  const [editOpen, setEditOpen] = useState(false);
  const c = onboardingCopy.vReflect;
  const r = reflectionOf(answers);

  const line = {
    fontFamily: fonts.serifSemiBold,
    fontSize: 27,
    lineHeight: 37,
    letterSpacing: -0.2,
  };
  const ink = { color: colors.text.primary };
  const ember = { color: colors.accent.emberDeep };

  // Templates are split on their slots so each filled part can carry ember.
  const [l1a, l1b, l1c, l1d] = c.line1.split(/\{goal\}|\{mood\}|\{obstacle\}/);
  const [l2a, l2b, l2c] = c.line2.split(/\{dayPart\}|\{framing\}/);

  return (
    <>
      <ConversationScreen
        testID="v-reflect"
        screenId="v-reflect"
        center
        eyebrow={r.eyebrow}
        primaryTitle={c.primary}
        onPrimary={advance}
        secondaryTitle={c.secondary}
        onSecondary={() => setEditOpen(true)}
      >
        <Text allowFontScaling={false} style={[line, ink]}>
          {l1a}
          <Text style={ember}>{r.goalPhrase}</Text>
          {l1b}
          <Text style={ember}>{r.moodSoft}</Text>
          {l1c}
          <Text style={ember}>{r.obstaclePhrase}</Text>
          {l1d}
        </Text>
        <Text allowFontScaling={false} style={[line, ink, { marginTop: spacing.md }]}>
          {l2a}
          <Text style={ember}>{r.dayPart}</Text>
          {l2b}
          <Text style={ember}>{r.framing}</Text>
          {(l2c ?? '').replace('{blocked}', r.blocked)}
        </Text>
      </ConversationScreen>
      <EditGuardSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
