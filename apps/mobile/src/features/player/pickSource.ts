import type { PlayableMoment } from '@/features/moments/useMoments';

/**
 * The single file the one player loads. Music when the user wants it AND the
 * moment has a baked bed; otherwise the voice-only file. One file, one player —
 * this is what keeps Android off the broken dual-AudioPlayer path (expo#36034).
 */
export function pickSource(moment: PlayableMoment | null, ambientEnabled: boolean): string | null {
  if (!moment) return null;
  return ambientEnabled && moment.musicAudioSource ? moment.musicAudioSource : moment.audioSource;
}
