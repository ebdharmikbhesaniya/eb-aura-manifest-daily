import type { OnboardingScreenId } from '@aura/shared';
import { useRouter } from 'expo-router';
import { Modal, Pressable, Text } from 'react-native';

import { TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { QUESTION_SCREENS, screenRoute } from './flow';

/** Screen id → the question she'll recognise it by. */
const SCREEN_LABEL: Partial<Record<OnboardingScreenId, string>> = {
  'a04-goals': 'What you want to bring in',
  'q-priority': 'Which matters most',
  'q-context': 'Where you are with it',
  's03-name': onboardingCopy.s03Name.question,
  'a05-feeling': 'How the last weeks have been',
  'a06-obstacle': 'What gets in the way',
  'q-lexicon': 'The language that lands',
  'q-offlimits': 'What to stay away from',
  'q-belief': 'What you could say and mean',
  'q-calibration': 'How “I am confident” reads',
  'a08-ritual-time': 'When you take your three minutes',
};

/**
 * The edit-guard (product 07): revise any answer, never restart. Only answered
 * screens are offered — there is nothing to "fix" ahead of the conversation.
 *
 * A plain Modal rather than the gorhom Sheet: this sheet must work INSIDE the
 * onboarding stack before the tab world exists, and it is a simple picker — the
 * detent machinery would be ceremony here.
 */
export function EditGuardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { colors, radii, spacing, typography } = useTheme();
  const answers = useOnboardingDraft((s) => s.answers);

  const editable = QUESTION_SCREENS.filter((id) => answers[id] && SCREEN_LABEL[id]);

  const startEdit = (target: OnboardingScreenId) => {
    onClose();
    useOnboardingDraft.getState().beginEdit(target);
    router.push(screenRoute(target) as never);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={onboardingCopy.editGuard.cancel}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.surface.scrim, justifyContent: 'flex-end' }}
      >
        <Pressable
          // Swallow taps so tapping the sheet body doesn't dismiss.
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface.sheet,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={[typography.title, { color: colors.text.primary }]}>
            {onboardingCopy.editGuard.title}
          </Text>
          <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
            {onboardingCopy.editGuard.note}
          </Text>

          {editable.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              onPress={() => startEdit(id)}
              style={{ paddingVertical: spacing.sm }}
            >
              <Text style={[typography.body, { color: colors.text.primary }]}>
                {SCREEN_LABEL[id]}
              </Text>
            </Pressable>
          ))}

          <TextButton title={onboardingCopy.editGuard.cancel} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
