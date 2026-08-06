import type { KaraokeLine, WordTiming } from '@/features/letter/karaoke';

export type LineGlow = 'active' | 'past' | 'upcoming';
export type WordGlow = 'spoken' | 'current' | 'upcoming';

/**
 * Index of the line being spoken: the last line whose start is at or behind the
 * position. -1 before the first line. `'worklet'` so the auto-scroll reaction can
 * call it on the UI thread; it runs as ordinary JS under jest and in unit tests.
 */
export function activeLineIndex(lines: KaraokeLine[], positionMs: number): number {
  'worklet';
  let found = -1;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i]?.startMs ?? 0) <= positionMs) found = i;
    else break;
  }
  return found;
}

/** Where a line sits relative to the one being spoken. */
export function lineState(index: number, activeIndex: number): LineGlow {
  'worklet';
  if (index === activeIndex) return 'active';
  return index < activeIndex ? 'past' : 'upcoming';
}

/**
 * Where a word sits in the glow sweep. Current spans [startMs, endMs] inclusive so
 * a word never blinks dark between its own start and end.
 */
export function wordState(word: WordTiming, positionMs: number): WordGlow {
  'worklet';
  if (positionMs > word.endMs) return 'spoken';
  if (positionMs >= word.startMs) return 'current';
  return 'upcoming';
}
