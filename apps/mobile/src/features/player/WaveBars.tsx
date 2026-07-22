import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Bar geometry (v4 §player). Local numerics: these are the waveform's own
 * shape, not spacing the 4pt grid governs — no token fits a 3.5pt bar.
 */
const BAR_COUNT = 40;
const BAR_WIDTH = 3.5;
const BAR_GAP = 2.5;
const BAR_RADIUS = 2;
const MIN_HEIGHT = 6;
/** Amplitudes and frequencies of the two sines that shape the pattern. */
const PRIMARY_AMPLITUDE = 16;
const SECONDARY_AMPLITUDE = 4;
const PRIMARY_FREQUENCY = 1.7;
const SECONDARY_FREQUENCY = 0.6;
/** Row height — tall enough for the tallest bar, so progress never reflows. */
const ROW_HEIGHT = 28;

/**
 * Deterministic, not audio-derived: every moment gets the same calm waveform,
 * which is a progress control wearing the audio's clothes — honest about being
 * decoration, stable across renders, and free of any per-frame metering cost.
 */
const HEIGHTS = Array.from(
  { length: BAR_COUNT },
  (_, i) =>
    MIN_HEIGHT +
    Math.abs(
      Math.sin(i * PRIMARY_FREQUENCY) * PRIMARY_AMPLITUDE +
        Math.sin(i * SECONDARY_FREQUENCY) * SECONDARY_AMPLITUDE,
    ),
);

export interface WaveBarsProps {
  /** 0–1 playback progress. Bars at or before it burn ember; the rest wait. */
  progress: number;
  testID?: string;
}

/**
 * The player's waveform progress (v4 §player). One job: show how far the voice
 * has travelled. Ember is earned — this and the orb are the only places it
 * burns, so progress = `accent.ember`, remainder = `accent.emberFaint`.
 *
 * Times, transport and scrubbing belong to the caller; the two time labels
 * underneath already carry progress for assistive tech, so the bars themselves
 * are hidden from it.
 */
export function WaveBars({ progress, testID }: WaveBarsProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: ROW_HEIGHT,
        gap: BAR_GAP,
      }}
    >
      {HEIGHTS.map((height, index) => (
        <View
          // The pattern is fixed, so the index IS the identity of a bar.
          key={index}
          style={{
            width: BAR_WIDTH,
            height,
            borderRadius: BAR_RADIUS,
            backgroundColor:
              index / BAR_COUNT <= progress ? colors.accent.ember : colors.accent.emberFaint,
          }}
        />
      ))}
    </View>
  );
}
