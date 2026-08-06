import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * A frame-rate playback position for the player's synced lyrics (10 §5).
 *
 * The store's `positionMs` updates only at the audio-status rate (~2–4Hz) — far
 * too coarse for a word-by-word glow, which needs 60fps to sweep smoothly. This
 * advances the position every frame while playing and SNAPS it back to the
 * store's absolute value whenever that changes (the drift guard). Same technique
 * the Letter uses in `useLetterPlayback`.
 */
export function useSmoothPosition(positionMs: number, playing: boolean): SharedValue<number> {
  const smooth = useSharedValue(positionMs);
  const isPlaying = useSharedValue(playing ? 1 : 0);

  useEffect(() => {
    isPlaying.value = playing ? 1 : 0;
  }, [playing, isPlaying]);

  useEffect(() => {
    // Snap to the audio's absolute truth on every status update.
    smooth.value = positionMs;
  }, [positionMs, smooth]);

  useFrameCallback((frame) => {
    'worklet';
    if (isPlaying.value === 0) return;
    smooth.value += frame.timeSincePreviousFrame ?? 0;
  });

  return smooth;
}
