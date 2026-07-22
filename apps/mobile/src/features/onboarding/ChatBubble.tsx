import { View } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';

export type ChatBubbleTone = 'card' | 'parchment' | 'blush';

export interface ChatBubbleProps {
  /**
   * 'card' — Aura's white speech bubbles (S2). 'parchment' — reflection beats.
   * 'blush' — the one vulnerable beat (S10's struggle acknowledgment).
   */
  tone?: ChatBubbleTone;
  children: ReactNode;
  testID?: string;
}

/**
 * A speech bubble in Aura's voice (v4 S2 + reflection beats): asymmetric
 * radius — a small "spoken from" corner top-left, soft everywhere else — so it
 * reads as conversation, not as another card.
 */
export function ChatBubble({ tone = 'card', children, testID }: ChatBubbleProps) {
  const { colors, radii, scheme, shadows, spacing } = useTheme();

  const background =
    tone === 'card'
      ? colors.surface.card
      : tone === 'parchment'
        ? colors.accent.parchment
        : colors.accent.blushSoft;

  const softCorner = radii.field + spacing.xs;

  return (
    <View
      testID={testID}
      style={[
        {
          alignSelf: 'flex-start',
          maxWidth: '88%',
          backgroundColor: background,
          borderTopLeftRadius: spacing.xs,
          borderTopRightRadius: softCorner,
          borderBottomLeftRadius: softCorner,
          borderBottomRightRadius: softCorner,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
        tone === 'card' && { borderWidth: 1, borderColor: colors.surface.border },
        // Hairline + soft lift in light; in dark the border alone carries depth
        // (same rule as Card — ink shadows vanish on the warm dark base).
        tone === 'card' && scheme === 'light' && shadows.field,
      ]}
    >
      {children}
    </View>
  );
}
