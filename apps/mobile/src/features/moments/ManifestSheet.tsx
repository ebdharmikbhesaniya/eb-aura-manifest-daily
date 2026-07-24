import { LIMITS } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Chip, Input, PillButton, SerifDisplay, Sheet } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface ManifestSheetProps {
  creditsRemaining: number;
  onSubmit: (desireText: string) => void;
  busy?: boolean;
  /** In-voice failure line (07 §5). Never a code (05 §8). */
  error?: string | null;
}

/**
 * Manifest Anything (product 09 §9.2).
 *
 * The credits line is framed as SPECIALNESS, not scarcity — "I make them
 * count", never "only 2 left". It is a real cost control (every moment is LLM +
 * TTS spend), and product 09 is explicit that the framing must not become
 * pressure. There is no upsell here when she runs out, just an honest note that
 * they return Monday.
 */
export const ManifestSheet = forwardRef<BottomSheetModal, ManifestSheetProps>(
  function ManifestSheet({ creditsRemaining, onSubmit, busy = false, error = null }, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();

    const [desire, setDesire] = useState('');

    const creditLine =
      creditsRemaining <= 0
        ? momentsCopy.manifest.none
        : creditsRemaining === 1
          ? momentsCopy.manifest.lastOne
          : momentsCopy.manifest.remaining.replace('{n}', String(creditsRemaining));

    const tooLong = desire.trim().length > LIMITS.DESIRE_TEXT_MAX;
    const canSubmit = desire.trim() !== '' && !tooLong && creditsRemaining > 0;

    return (
      <Sheet ref={ref} snapPoints={['54%']}>
        <BottomSheetView
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
        >
          <View style={{ gap: spacing.xs }}>
            <SerifDisplay variant="sheetTitle">{momentsCopy.manifest.title}</SerifDisplay>
            <Text
              allowFontScaling={false}
              style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
            >
              {momentsCopy.manifest.description}
            </Text>
          </View>

          <Input
            inSheet
            value={desire}
            onChangeText={setDesire}
            placeholder={momentsCopy.manifest.placeholder}
            multiline
            sunken
            testID="manifest-input"
          />

          {/* Inspiration rather than instruction — product 09 §9.2 asks for
              examples drawn from her own goal area; until Phase 8 supplies those
              signals these are the neutral defaults. Tapping one starts her off. */}
          {desire.trim() === '' && (
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
              testID="manifest-examples"
            >
              {momentsCopy.manifest.examples.map((example) => (
                <Chip
                  key={example}
                  label={example}
                  selected={false}
                  onPress={() => setDesire(example)}
                />
              ))}
            </View>
          )}

          {error && (
            <Text
              testID="manifest-error"
              allowFontScaling={false}
              style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
            >
              {error}
            </Text>
          )}

          <PillButton
            title={busy ? momentsCopy.manifest.working : momentsCopy.manifest.submit}
            loading={busy}
            disabled={!canSubmit}
            onPress={() => onSubmit(desire.trim())}
            testID="manifest-submit"
          />

          <Text
            testID="manifest-credits"
            allowFontScaling={false}
            style={[
              scaledType('bodySmall', scale),
              { color: colors.text.disabled, textAlign: 'center' },
            ]}
          >
            {creditLine}
          </Text>
        </BottomSheetView>
      </Sheet>
    );
  },
);
