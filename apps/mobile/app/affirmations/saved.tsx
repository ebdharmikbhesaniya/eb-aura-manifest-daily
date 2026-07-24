import { useRouter } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { Card, Screen, ScreenHeader } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { KeptRow } from '@/features/affirmations/KeptRow';
import { useKeptAffirmations } from '@/features/affirmations/useAffirmations';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/**
 * `affirmations/saved` (06 §1) — her kept words in full.
 *
 * The tab previews the most recent few; this is everything, in the same
 * heart-marked serif row (v4 §saved) so arriving here reads as the same list
 * continuing rather than a different screen. Empty copy is an invitation, never
 * a scold (product 09).
 */
export default function SavedAffirmationsRoute() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  const userId = useAppState((s) => s.userId);
  const { data: kept } = useKeptAffirmations(userId ?? undefined);
  const items = kept ?? [];

  return (
    <Screen testID="affirmations-saved">
      <ScrollView
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={affirmationsCopy.collectionTitle} onBack={() => router.back()} />

        {items.length === 0 ? (
          <Card variant="solid">
            <Text
              testID="affirmations-saved-empty"
              allowFontScaling={false}
              style={[scaledType('body', scale), { color: colors.text.secondary }]}
            >
              {affirmationsCopy.collectionEmpty}
            </Text>
          </Card>
        ) : (
          items.map((item) => <KeptRow key={item.id} text={item.text} />)
        )}
      </ScrollView>
    </Screen>
  );
}
