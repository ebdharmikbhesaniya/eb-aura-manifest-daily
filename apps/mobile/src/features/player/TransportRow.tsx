import { Pressable, Text, View } from 'react-native';

import { PlayCircle } from '@/components';
import { playerCopy } from '@/copy/player';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/** The player's disc is the large variant, with the earned ember halo (v4 §player). */
const DISC_SIZE = 64;

export interface TransportRowProps {
  playing: boolean;
  onToggle: () => void;
  onBack15: () => void;
  onForward15: () => void;
}

/**
 * The transport (v4 §player): ±15s as small bordered pills either side of the
 * ink disc. One job — move through the audio. Waveform, times and the option
 * pills live with the caller.
 */
export function TransportRow({ playing, onToggle, onBack15, onForward15 }: TransportRowProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
      }}
    >
      <SkipPill
        label={playerCopy.back15}
        glyph={playerCopy.back15Short}
        onPress={onBack15}
        testID="player-back15"
      />

      <PlayCircle
        playing={playing}
        size={DISC_SIZE}
        halo
        onPress={onToggle}
        accessibilityLabel={playing ? playerCopy.pause : playerCopy.play}
        testID="player-toggle"
      />

      <SkipPill
        label={playerCopy.forward15}
        glyph={playerCopy.forward15Short}
        onPress={onForward15}
        testID="player-forward15"
      />
    </View>
  );
}

/** "−15" / "+15" — quiet bordered pills; the border whispers, the disc speaks. */
function SkipPill({
  label,
  glyph,
  onPress,
  testID,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={12}
      testID={testID}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: colors.accent.oliveFaint,
        borderRadius: radii.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}
