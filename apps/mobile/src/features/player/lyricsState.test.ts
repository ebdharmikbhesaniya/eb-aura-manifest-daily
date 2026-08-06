import type { KaraokeLine } from '@/features/letter/karaoke';

import { activeLineIndex, lineState, wordState } from './lyricsState';

const line = (index: number, startMs: number): KaraokeLine => ({
  index,
  text: `line ${index}`,
  words: [],
  startMs,
  endMs: startMs + 1000,
});

describe('activeLineIndex', () => {
  const lines = [line(0, 0), line(1, 1000), line(2, 2000)];

  it('is -1 before the first line starts', () => {
    expect(activeLineIndex(lines, -1)).toBe(-1);
  });

  it('picks the last line whose start is at or behind the position', () => {
    expect(activeLineIndex(lines, 0)).toBe(0);
    expect(activeLineIndex(lines, 1500)).toBe(1);
    expect(activeLineIndex(lines, 9999)).toBe(2);
  });
});

describe('lineState', () => {
  it('maps active, past and upcoming around the active index', () => {
    expect(lineState(2, 2)).toBe('active');
    expect(lineState(1, 2)).toBe('past');
    expect(lineState(3, 2)).toBe('upcoming');
  });
});

describe('wordState', () => {
  const word = { word: 'hi', startMs: 1000, endMs: 1500 };

  it('is upcoming before the word starts', () => {
    expect(wordState(word, 999)).toBe('upcoming');
  });

  it('is current from startMs through endMs inclusive', () => {
    expect(wordState(word, 1000)).toBe('current');
    expect(wordState(word, 1250)).toBe('current');
    expect(wordState(word, 1500)).toBe('current');
  });

  it('is spoken once past endMs', () => {
    expect(wordState(word, 1501)).toBe('spoken');
  });
});
