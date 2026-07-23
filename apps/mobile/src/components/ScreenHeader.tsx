import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/** The chevron sits a touch heavier than body text so it reads as a control. */
const CHEVRON_SIZE = 18;

export interface ScreenHeaderProps {
  title: string;
  /** Omit on a screen there is no going back from. */
  onBack?: () => void;
  /** Spoken label for the chevron — the glyph itself announces nothing. */
  backLabel?: string;
  testID?: string;
}

/**
 * The header a PUSHED screen wears (v4 §subscription, §settings): a back
 * chevron, then the title in serif closing on an ember period.
 *
 * Pushed screens had no header at all. The root Stack sets
 * `headerShown: false` app-wide — right, because every screen owns its own
 * chrome — but nothing was drawing the replacement, so Subscription, Settings
 * and the profile sub-pages arrived with no title and no visible way back. On
 * Android the hardware key covered it; on iOS the only way out was a swipe
 * nobody was told about.
 *
 * The ember period is the brand mark v4 puts on every title. It is one of
 * ember's few sanctioned appearances outside voice, and it is why the title is
 * assembled here rather than passed through `SerifDisplay`.
 */
export function ScreenHeader({ title, onBack, backLabel = 'Back', testID }: ScreenHeaderProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={16}
          onPress={onBack}
          testID={testID ? `${testID}-back` : 'screen-header-back'}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontSize: CHEVRON_SIZE * scale,
              lineHeight: CHEVRON_SIZE * scale * 1.2,
              color: colors.text.secondary,
            }}
          >
            ‹
          </Text>
        </Pressable>
      )}

      <Text
        allowFontScaling={false}
        style={[scaledType('subScreenTitle', scale), { flex: 1, color: colors.text.primary }]}
      >
        {title}
        <Text style={{ color: colors.accent.ember }}>.</Text>
      </Text>
    </View>
  );
}
