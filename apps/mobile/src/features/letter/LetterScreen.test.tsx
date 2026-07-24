import { act, render, screen } from '@testing-library/react-native';

import { letterCopy } from '@/copy/letter';
import * as haptics from '@/theme/haptics';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LetterMotionProvider } from '@/theme/motion';

import { groupIntoLines, type WordTiming } from './karaoke';
import { LetterScreen } from './LetterScreen';
import type { Letter } from './useLetter';

jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));

const audio = jest.requireMock('expo-audio') as {
  __setStatus: (
    next: Partial<{
      playing: boolean;
      currentTime: number;
      duration: number;
      didJustFinish: boolean;
      /** Mirrors AudioStatus.error — null unless the source failed to load. */
      error: string | null;
    }>,
  ) => void;
  __resetStatus: () => void;
  __player: { play: jest.Mock };
};

const { analytics } = jest.requireMock('@/lib/analytics') as { analytics: { capture: jest.Mock } };

/**
 * The Letter surface (product 08 §4–8).
 *
 * What can be checked off-device is the choreography: that the two haptics fire
 * where product 08 says and nowhere else, that the ending waits for the audio,
 * and that no control ever appears. How it FEELS at 60fps is the founder's
 * device pass — these tests guard the spec, not the beauty.
 */
describe('LetterScreen', () => {
  const timings = (words: string[]): WordTiming[] =>
    words.map((word, i) => ({ word, startMs: i * 400, endMs: i * 400 + 350 }));

  const letter = (): Letter => {
    const words = timings([
      'Maya,',
      'it',
      'is',
      'morning',
      'here.',
      'You',
      'started',
      'this',
      'on',
      'a',
      'Friday',
      'in',
      'July.',
      'Keep',
      'going.',
    ]);
    return {
      id: 'moment-1',
      title: 'The Kitchen',
      body: words.map((w) => w.word).join(' '),
      audioSource: 'file:///cache/audio/moment-1.mp3',
      durationMs: 6_000,
      lines: groupIntoLines(words),
    };
  };

  const renderLetter = (onContinue = jest.fn()) =>
    render(
      <ThemeProvider>
        <LetterMotionProvider>
          <LetterScreen letter={letter()} onContinue={onContinue} testID="letter" />
        </LetterMotionProvider>
      </ThemeProvider>,
    );

  /** Pushes playback to a position and lets the status effect run. */
  const playTo = async (ms: number, { finished = false } = {}) => {
    await act(async () => {
      audio.__setStatus({
        playing: !finished,
        currentTime: ms / 1000,
        duration: 6,
        didJustFinish: finished,
      });
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    haptics.resetHaptics();
    audio.__resetStatus();
    jest.clearAllMocks();
  });

  it('renders her letter as lines of text', async () => {
    await renderLetter();

    expect(screen.getByTestId('letter-karaoke')).toBeTruthy();
    expect(screen.getByText(/Maya,/)).toBeTruthy();
  });

  it('starts playing on its own — she touches nothing (product 08 §6)', async () => {
    await renderLetter();

    expect(audio.__player.play).toHaveBeenCalled();
  });

  describe('controls', () => {
    it('shows none at all while the letter plays', async () => {
      await renderLetter();
      await playTo(1_000);

      expect(screen.queryByLabelText(/pause/i)).toBeNull();
      expect(screen.queryByLabelText(/skip/i)).toBeNull();
      expect(screen.queryByLabelText(/close/i)).toBeNull();
      expect(screen.queryByTestId('letter-continue')).toBeNull();
    });
  });

  describe('the two haptic beats (product 08 §8)', () => {
    it('fires one light impact as the first word begins', async () => {
      const spy = jest.spyOn(haptics, 'haptic');
      await renderLetter();

      await playTo(50);

      expect(spy).toHaveBeenCalledWith('letterAudioBegan');
    });

    it('does not fire before the audio actually moves', async () => {
      const spy = jest.spyOn(haptics, 'haptic');
      await renderLetter();

      await playTo(0);

      expect(spy).not.toHaveBeenCalled();
    });

    it('fires a soft tick when the date-close line is reached', async () => {
      const spy = jest.spyOn(haptics, 'haptic');
      await renderLetter();

      await playTo(50);
      spy.mockClear();
      // "…on a Friday in July." sits near the end of this fixture.
      await playTo(4_400);

      expect(spy).toHaveBeenCalledWith('letterClosingLine');
    });

    it('ticks the closing line only once, however long she lingers', async () => {
      const spy = jest.spyOn(haptics, 'haptic');
      await renderLetter();

      await playTo(50);
      spy.mockClear();
      await playTo(4_400);
      await playTo(4_800);
      await playTo(5_200);

      expect(spy.mock.calls.filter(([e]) => e === 'letterClosingLine')).toHaveLength(1);
    });
  });

  describe('when the audio ends', () => {
    it('offers the ending and its single button', async () => {
      await renderLetter();
      await playTo(6_000, { finished: true });

      expect(screen.getByText(letterCopy.ending.more)).toBeTruthy();
      expect(screen.getByTestId('letter-continue')).toBeTruthy();
    });

    it('shows nothing of the ending while it is still playing', async () => {
      await renderLetter();
      await playTo(3_000);

      expect(screen.queryByText(letterCopy.ending.more)).toBeNull();
    });
  });

  /**
   * Observed on a real device, 2026-07-24: the generated audio came back in a
   * format ExoPlayer could not read, and the Letter became a permanently blank
   * screen with no way forward.
   *
   * Every line's opacity is driven off `positionMs`, which only advances from
   * `status.currentTime`; the ending is gated on `didJustFinish`. With audio
   * that never loads, both stay at zero forever — so she sat on an empty screen
   * at the emotional peak of the product, with the only exit being to kill the
   * app. The words themselves were fine and already on the device.
   */
  describe('when the audio cannot be played at all', () => {
    const failAudio = async () => {
      await act(async () => {
        audio.__setStatus({ playing: false, error: 'Source error' });
        await Promise.resolve();
      });
    };

    it('still shows her the words — the letter is not lost with its voice', async () => {
      await renderLetter();
      await failAudio();

      expect(screen.getByTestId('letter-karaoke')).toBeTruthy();
      expect(screen.getByText(/Maya,/)).toBeTruthy();
    });

    it('offers the way forward, so a broken file is not a dead end', async () => {
      await renderLetter();
      await failAudio();

      expect(screen.getByTestId('letter-continue')).toBeTruthy();
    });

    it('does not offer it merely because playback has not started yet', async () => {
      // The difference between "loading" and "will never load" is the whole
      // point — showing the ending early would cut the wow short every time.
      await renderLetter();
      await playTo(0);

      expect(screen.queryByTestId('letter-continue')).toBeNull();
    });

    it('keeps the ending once the audio recovers nothing', async () => {
      await renderLetter();
      await failAudio();
      await act(async () => {
        audio.__setStatus({ currentTime: 0 });
        await Promise.resolve();
      });

      expect(screen.getByTestId('letter-continue')).toBeTruthy();
    });
  });

  describe('analytics (13 §2 — structure only, never content)', () => {
    it('reports that playback started', async () => {
      await renderLetter();
      await playTo(50);

      expect(analytics.capture).toHaveBeenCalledWith('letter_playback_started');
    });

    it('reports a full listen when it runs to the end', async () => {
      await renderLetter();
      await playTo(50);
      await playTo(6_000, { finished: true });

      expect(analytics.capture).toHaveBeenCalledWith('letter_playback_completed', {
        listened_pct: 100,
      });
    });

    it('carries no word of what the letter said', async () => {
      await renderLetter();
      await playTo(50);
      await playTo(6_000, { finished: true });

      const payloads = JSON.stringify(analytics.capture.mock.calls);
      expect(payloads).not.toContain('Maya');
      expect(payloads).not.toContain('morning');
    });
  });
});
