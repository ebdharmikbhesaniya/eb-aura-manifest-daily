import { Pressable, Text, View } from 'react-native';

import { playerCopy } from '@/copy/player';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { formatTime, usePlayerStore } from './playerStore';

/**
 * The inverted disc (v4 §home: cream on ink). PlayCircle is the opposite
 * polarity — ink disc, cream glyph — so the mini-player draws its own.
 */
const DISC_SIZE = 34;
/** Same glyph-to-disc ratio PlayCircle uses. */
const GLYPH_RATIO = 0.34;

export interface MiniPlayerProps {
  onToggle: () => void;
  /**
   * How far above the bottom of the window the pill sits, in points.
   *
   * The caller owns the number because only it knows the safe-area inset and
   * the height of the tab bar this pill stacks on top of. Without it the pill
   * renders flush against the window edge, where Android's system navigation
   * bar covers it.
   */
  bottomOffset: number;
  testID?: string;
}

/**
 * The mini-player (06 §2, v4 §home) — the ink pill above the tab bar.
 *
 * Renders whenever a moment is loaded and the cover is minimized — this is the
 * component that makes "audio continues while she moves around the app" visible
 * rather than merely true. One line says what and how much is left; the small
 * cream disc pauses it.
 *
 * Tapping the bar re-opens the cover; the play/pause control is a separate,
 * smaller target so the common intent (get back to the moment) is the whole bar
 * and the rarer one (stop it) is deliberate.
 */
export function MiniPlayer({ onToggle, bottomOffset, testID }: MiniPlayerProps) {
  const { colors, spacing, radii, shadows } = useTheme();
  const scale = clampedFontScale();

  const moment = usePlayerStore((s) => s.moment);
  const minimized = usePlayerStore((s) => s.minimized);
  const playing = usePlayerStore((s) => s.playing);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const expand = usePlayerStore((s) => s.expand);

  // Nothing loaded, or the cover is already open — the bar would be a duplicate.
  if (!moment || !minimized) return null;

  const remainingMs = Math.max(0, durationMs - positionMs);
  const line = playerCopy.miniLine
    .replace('{title}', moment.title ?? playerCopy.coverLabel)
    .replace('{remaining}', formatTime(remainingMs));

  return (
    <View
      testID={testID}
      style={{
        // Absolute, like the tab bar it stacks on: the tab-bar slot must
        // contribute NO layout height, because react-navigation reserves
        // whatever height it measures there as a bottom inset on every tab
        // screen. Laying this out in flow added that band of dead space below
        // the last card — the screens already pad themselves with
        // TAB_BAR_CLEARANCE, and the bar floats over content by design.
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: bottomOffset,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radii.pill,
        backgroundColor: colors.cta.background,
        paddingVertical: spacing.sm,
        paddingLeft: spacing.lg,
        paddingRight: spacing.sm,
        ...shadows.card,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moment.title ?? 'Now playing'}
        onPress={expand}
        style={{ flex: 1 }}
        testID="mini-player-expand"
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[scaledType('bodySmall', scale), { color: colors.text.onCta }]}
        >
          {line}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? playerCopy.pause : playerCopy.play}
        onPress={onToggle}
        hitSlop={12}
        style={{ marginLeft: spacing.sm }}
        testID="mini-player-toggle"
      >
        <View
          style={{
            width: DISC_SIZE,
            height: DISC_SIZE,
            borderRadius: radii.pill,
            backgroundColor: colors.text.onCta,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            allowFontScaling={false}
            style={{ fontSize: DISC_SIZE * GLYPH_RATIO, color: colors.cta.background }}
          >
            {playing ? '❙❙' : '▶'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
