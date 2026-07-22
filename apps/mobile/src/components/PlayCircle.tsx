import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface PlayCircleProps {
  playing?: boolean;
  /** Disc diameter. 44 inside cards; 64 for the full player's transport. */
  size?: number;
  /** The soft ember glow behind the disc — the player only; ember is earned. */
  halo?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * The circular ink play/pause disc (v4 §home/player). One job: show and toggle
 * playback. Timing text, titles and waveforms belong to the caller.
 */
export function PlayCircle({
  playing = false,
  size = 44,
  halo = false,
  onPress,
  accessibilityLabel,
  testID,
}: PlayCircleProps) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ width: size, height: size }}>
        {halo && (
          <View
            style={{
              position: 'absolute',
              top: -size * 0.14,
              left: -size * 0.14,
              right: -size * 0.14,
              bottom: -size * 0.14,
              borderRadius: radii.pill,
              backgroundColor: colors.accent.ember,
              opacity: 0.25,
            }}
          />
        )}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radii.pill,
            backgroundColor: colors.cta.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            allowFontScaling={false}
            style={{ fontSize: size * 0.34, color: colors.text.onCta }}
          >
            {playing ? '❙❙' : '▶'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
