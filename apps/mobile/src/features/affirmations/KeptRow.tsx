import { Text } from 'react-native';

import { Card } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface KeptRowProps {
  text: string;
}

/**
 * A kept affirmation (v4 §saved): her words in the voice serif.
 *
 * Shared by the tab's preview and the pushed `affirmations/saved` record, which
 * is the point — the two views show the same rows, so they have to speak the
 * same language. The pushed screen used to render a plain sans line instead,
 * and arriving there read as landing somewhere else in the app.
 *
 * A decorative heart used to sit at the row's end (a "kept" mark). It was not a
 * control — no press, out of the accessibility tree — but it read as a broken
 * like button, so it was removed (2026-07-30). The row already says what it is.
 */
export function KeptRow({ text }: KeptRowProps) {
  const { colors } = useTheme();
  const scale = clampedFontScale();

  return (
    <Card variant="solid">
      <Text
        allowFontScaling={false}
        style={[scaledType('letterLine', scale), { color: colors.text.body }]}
      >
        “{text}”
      </Text>
    </Card>
  );
}
