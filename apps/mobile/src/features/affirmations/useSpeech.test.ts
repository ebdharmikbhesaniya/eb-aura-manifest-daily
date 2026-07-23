import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { useSpeech } from './useSpeech';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

const speak = Speech.speak as jest.Mock;
const stop = Speech.stop as jest.Mock;

type SpeakOptions = { onDone?: () => void; onError?: () => void };
const lastOptions = (): SpeakOptions => speak.mock.calls.at(-1)?.[1] as SpeakOptions;

/** Renders the hook and waits for the first commit — `current` is null until then. */
async function mountSpeech() {
  const view = await renderHook(() => useSpeech());
  await waitFor(() => expect(view.result.current).not.toBeNull());
  return view;
}

/**
 * "Hear it read" is the button that spent a release doing nothing, so the two
 * things pinned here are that it starts, and that it always stops — a voice
 * left running past the screen is worse than no voice at all.
 */
describe('useSpeech', () => {
  beforeEach(() => {
    speak.mockClear();
    stop.mockClear();
  });

  it('reads the line and reports that it is speaking', async () => {
    const { result } = await mountSpeech();

    await act(async () => result.current.toggle('one quiet morning at a time'));

    expect(speak).toHaveBeenCalledWith('one quiet morning at a time', expect.anything());
    expect(result.current.speaking).toBe(true);
  });

  it('stops when tapped a second time', async () => {
    const { result } = await mountSpeech();

    await act(async () => result.current.toggle('a line'));
    await act(async () => result.current.toggle('a line'));

    expect(stop).toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('settles when the reader reaches the end on its own', async () => {
    const { result } = await mountSpeech();
    await act(async () => result.current.toggle('a line'));

    await act(async () => lastOptions().onDone?.());

    expect(result.current.speaking).toBe(false);
  });

  it('settles rather than sticking on when the reader errors', async () => {
    const { result } = await mountSpeech();
    await act(async () => result.current.toggle('a line'));

    await act(async () => lastOptions().onError?.());

    expect(result.current.speaking).toBe(false);
  });

  it('never leaves a voice running after the screen goes away', async () => {
    const { result, unmount } = await mountSpeech();
    await act(async () => result.current.toggle('a line'));
    stop.mockClear();

    await unmount();

    expect(stop).toHaveBeenCalled();
  });

  it('survives a dev client built before expo-speech existed', async () => {
    speak.mockImplementationOnce(() => {
      throw new Error('Cannot find native module ExpoSpeech');
    });
    const { result } = await mountSpeech();

    await act(async () => result.current.toggle('a line'));

    // Reported upstream, but the screen keeps working and the button resets.
    expect(result.current.speaking).toBe(false);
  });
});
