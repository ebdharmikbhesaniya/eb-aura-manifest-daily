import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { ConversationScreen } from '../ConversationScreen';
import { NotificationHero } from '../NotificationHero';
import { useConversation } from '../useConversation';

/**
 * S13 — the commitment beat (founder decision, 2026-08-10).
 *
 * A quiet "are you ready" moment after she has shared everything and before the
 * Letter is generated. Committing to a goal lifts follow-through (the
 * Duolingo/Headway pattern), but this is the honest version: it is said in the
 * future-self voice and carries a single affirmative — no coercive hold, no
 * fingerprint gimmick, no loss framing. It carries no answer and draws no
 * progress step; "I'm ready" advances to the notification education screen.
 *
 * (Reuses the onboarding orb hero — the same glowing ember visual as the
 * notification beats — so it reads as a designed moment, not a bare question.)
 */
export function S13Commit() {
  const { advance } = useConversation('s13-commit');
  const nameValue = useOnboardingDraft((s) => s.answers['s03-name']?.value);
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';

  const c = onboardingCopy.s13Commit;
  const question = name ? c.question.replace('{name}', name) : c.questionNoName;

  return (
    <ConversationScreen
      testID="s13-commit"
      // No progress header (carries no answer) and no edit-guard on a moment
      // that isn't a question.
      showEditGuard={false}
      question={question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={advance}
    >
      <NotificationHero icon="sparkles-outline" />
    </ConversationScreen>
  );
}
