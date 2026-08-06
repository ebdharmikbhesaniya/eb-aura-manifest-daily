import { ElevenLabsTtsProvider } from './elevenlabs-tts.provider';

/**
 * The ElevenLabs adapter (10 §2). These cover the outbound contract — a happy
 * synth, an HTTP error surfaced with its status, and the timeout that keeps a
 * stalled provider from hanging a generation worker.
 */
describe('ElevenLabsTtsProvider', () => {
  const provider = new ElevenLabsTtsProvider({
    apiKey: 'sk_test',
    model: 'eleven_multilingual_v2',
  });
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  it('returns audio and word timings on success', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        audio_base64: Buffer.from('hello').toString('base64'),
        alignment: {
          characters: ['H', 'i'],
          character_start_times_seconds: [0, 0.1],
          character_end_times_seconds: [0.1, 0.2],
        },
      }),
    })) as unknown as typeof fetch;

    const out = await provider.synthesize({ text: 'Hi', voiceId: 'v1' });

    expect(out.audio).toBeInstanceOf(Buffer);
    expect(out.wordTimings).toEqual([{ word: 'Hi', startMs: 0, endMs: 200 }]);
    expect(out.durationMs).toBe(200);
  });

  it('surfaces an HTTP error with its status (e.g. 402 on a free plan)', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 402,
      text: async () => 'Free users cannot use library voices via the API.',
    })) as unknown as typeof fetch;

    await expect(provider.synthesize({ text: 'Hi', voiceId: 'v1' })).rejects.toThrow(
      /ElevenLabs 402/,
    );
  });

  it('times out rather than hanging the worker when the provider stalls', async () => {
    // fetch rejects with an AbortError as soon as the controller aborts.
    global.fetch = jest.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    ) as unknown as typeof fetch;

    jest.useFakeTimers();
    const promise = provider.synthesize({ text: 'Hi', voiceId: 'v1' });
    // Trip the 30s ceiling.
    jest.advanceTimersByTime(30_000);

    await expect(promise).rejects.toThrow(/timed out/);
  });
});
