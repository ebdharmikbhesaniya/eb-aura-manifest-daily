import { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

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
/** Exact width of the bar strip, so a touch's x maps straight to a fraction. */
const STRIP_WIDTH = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;
/** The bars are thin; pad the strip vertically so it is an easy target to grab. */
const TOUCH_PAD = 14;

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
  /** When set, the strip becomes a scrubber: tap or drag reports 0–1 on release. */
  onSeek?: ((fraction: number) => void) | undefined;
  testID?: string;
}

/**
 * The player's waveform progress AND scrubber (v4 §player). Shows how far the
 * voice has travelled, and — when `onSeek` is given — lets her tap or drag to
 * move there. Ember is earned: this and the orb are the only places it burns,
 * so progress = `accent.ember`, remainder = `accent.emberFaint`.
 *
 * While dragging, a local fraction drives the fill and the playhead so the
 * scrub feels instant; the real seek fires once, on release. The two time
 * labels underneath carry progress for assistive tech (the bars stay hidden),
 * and the ±15 transport buttons remain the accessible way to move.
 */
export function WaveBars({ progress, onSeek, testID }: WaveBarsProps) {
  const { colors } = useTheme();
  const [drag, setDrag] = useState<number | null>(null);

  const seekable = !!onSeek;
  // During a drag the local fraction wins so the fill tracks the finger; between
  // drags we follow the audio's real progress.
  const shown = drag ?? progress;

  const fractionAt = (e: GestureResponderEvent) =>
    Math.max(0, Math.min(1, e.nativeEvent.locationX / STRIP_WIDTH));

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          width: STRIP_WIDTH,
          paddingVertical: TOUCH_PAD,
          gap: BAR_GAP,
        }}
        onStartShouldSetResponder={() => seekable}
        onMoveShouldSetResponder={() => seekable}
        onResponderGrant={(e) => setDrag(fractionAt(e))}
        onResponderMove={(e) => setDrag(fractionAt(e))}
        onResponderRelease={(e) => {
          onSeek?.(fractionAt(e));
          setDrag(null);
        }}
        onResponderTerminate={() => setDrag(null)}
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
                index / BAR_COUNT <= shown ? colors.accent.ember : colors.accent.emberFaint,
            }}
          />
        ))}

        {seekable && (
          // A slim playhead so the scrub position is legible over the bars.
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: TOUCH_PAD - 2,
              bottom: TOUCH_PAD - 2,
              left: shown * STRIP_WIDTH - 1,
              width: 2,
              borderRadius: 1,
              backgroundColor: colors.text.primary,
            }}
          />
        )}
      </View>
    </View>
  );
}
