import type { PlayableMoment } from '@/features/moments/useMoments';

import { pickSource } from './pickSource';

const base: PlayableMoment = {
  id: 'm1',
  type: 'daily',
  status: 'ready',
  title: null,
  body: '',
  audioSource: 'voice.mp3',
  musicAudioSource: 'music.mp3',
  durationMs: 1000,
  favoritedAt: null,
  refineOf: null,
  lines: [],
};

describe('pickSource', () => {
  it('plays the music file when enabled and present', () => {
    expect(pickSource(base, true)).toBe('music.mp3');
  });

  it('plays voice when the toggle is off', () => {
    expect(pickSource(base, false)).toBe('voice.mp3');
  });

  it('plays voice when there is no music file even if enabled', () => {
    expect(pickSource({ ...base, musicAudioSource: null }, true)).toBe('voice.mp3');
  });

  it('is null when nothing is loaded', () => {
    expect(pickSource(null, true)).toBeNull();
  });
});
