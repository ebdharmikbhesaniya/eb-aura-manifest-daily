import { ScrollView, Text } from 'react-native';

import { Card, Label, Screen, SerifDisplay } from '@/components';
import { gratitudeCopy } from '@/copy/gratitude';
import { dayLabelFor } from '@/features/gratitude/dayLabel';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/**
 * `gratitude/history` (06 §1) — the full record, pushed from the tab.
 *
 * The tab shows a recent slice; this is everything, in the same
 * card-with-day-label language (v4 §gratitude). Reads the same local-first
 * store, so it works offline exactly as the tab does (product 09 §9.4).
 */
export default function GratitudeHistoryRoute() {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  const userId = useAppState((s) => s.userId);
  const { history } = useGratitude(userId ?? undefined);

  return (
    <Screen testID="gratitude-history">
      <ScrollView
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <SerifDisplay variant="title">{gratitudeCopy.historyTitle}</SerifDisplay>

        {history.length === 0 ? (
          <Card variant="solid">
            <Text
              allowFontScaling={false}
              style={[scaledType('body', scale), { color: colors.text.secondary }]}
            >
              {gratitudeCopy.historyEmpty}
            </Text>
          </Card>
        ) : (
          history.map((entry) => (
            <Card key={entry.entryDate} variant="solid" style={{ gap: spacing.xs }}>
              <Label>{dayLabelFor(entry.entryDate)}</Label>
              <Text
                allowFontScaling={false}
                style={[scaledType('body', scale), { color: colors.text.primary }]}
              >
                {entry.entry}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
