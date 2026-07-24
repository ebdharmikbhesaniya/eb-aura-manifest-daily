import { Text } from 'react-native';

import { Card } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface KeptRowProps {
  text: string;
}

/**
 * A kept affirmation (v4 §saved): her words in the voice serif, heart-marked.
 *
 * Shared by the tab's preview and the pushed `affirmations/saved` record, which
 * is the point — the two views show the same rows, so they have to speak the
 * same language. The pushed screen used to render a plain sans line instead,
 * and arriving there read as landing somewhere else in the app.
 */
export function KeptRow({ text }: KeptRowProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <Card variant="solid" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Text
        allowFontScaling={false}
        style={[scaledType('letterLine', scale), { flex: 1, color: colors.text.body }]}
      >
        “{text}”
      </Text>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: colors.accent.heart }]}
      >
        ♥
      </Text>
    </Card>
  );
}
