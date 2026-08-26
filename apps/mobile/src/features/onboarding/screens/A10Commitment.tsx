import { onboardingCopy } from '@/copy/onboarding';
import { analytics } from '@/lib/analytics';

import { ConversationScreen } from '../ConversationScreen';
import { NotificationHero } from '../NotificationHero';
import { useConversation } from '../useConversation';

/**
 * A10 — the micro-commitment beat (merged from the Aura design). Committing to a
 * goal lifts follow-through (Duolingo/Headway); this is the honest version — no
 * coercive hold, no loss framing. It carries no answer and draws no progress
 * step. Both "Yes, I'm ready" and "Not yet" advance (as in the design): the beat
 * is the ask, not a gate. Replaces s13-commit.
 *
 * The design's "…someone who {identity}" clause is dropped: the A07 identity
 * anchor is not part of this flow, so the line stays general.
 */
export function A10Commitment() {
  const { advance } = useConversation('a10-commitment');
  const c = onboardingCopy.a10Commitment;

  return (
    <ConversationScreen
      testID="a10-commitment"
      // No progress header or edit-guard on a moment that isn't a question.
      showEditGuard={false}
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => {
        analytics.capture('commitment_accepted', {});
        advance();
      }}
      skipTitle={c.secondary}
      onSkip={() => advance()}
    >
      <NotificationHero icon="sparkles-outline" />
    </ConversationScreen>
  );
}
