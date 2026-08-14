import { AnalyticsService } from './analytics.service';

/** Build the service with a config that yields no key → client is null (disabled). */
function makeService(): AnalyticsService {
  const config = { get: () => undefined } as never;
  return new AnalyticsService(config);
}

describe('AnalyticsService.captureException', () => {
  it('forwards the error to posthog-node with the user id and a source tag', () => {
    const service = makeService();
    const captureException = jest.fn();
    (service as unknown as { client: unknown }).client = {
      captureException,
      capture: jest.fn(),
      shutdown: jest.fn(),
    };

    const err = new Error('boom');
    service.captureException('user_1', err);

    expect(captureException).toHaveBeenCalledWith(err, 'user_1', { source: 'backend' });
  });

  it('is a silent no-op when disabled (no POSTHOG_SERVER_KEY)', () => {
    const service = makeService(); // client stays null
    expect(() => service.captureException('user_1', new Error('x'))).not.toThrow();
  });
});

describe('AnalyticsService.captureAiGeneration', () => {
  it('emits $ai_generation metadata with NO prompt/response content', () => {
    const service = makeService();
    const capture = jest.fn();
    (service as unknown as { client: unknown }).client = {
      capture,
      captureException: jest.fn(),
      shutdown: jest.fn(),
    };

    service.captureAiGeneration('user_1', {
      model: 'gpt-x',
      artifact: 'letter',
      inputTokens: 800,
      outputTokens: 200,
      latencyMs: 2500,
      isError: false,
    });

    const arg = capture.mock.calls[0][0];
    expect(arg.event).toBe('$ai_generation');
    expect(arg.properties.$ai_model).toBe('gpt-x');
    expect(arg.properties.$ai_input_tokens).toBe(800);
    expect(arg.properties.$ai_latency).toBe(2.5); // ms → seconds
    // The privacy guarantee: content fields are never present.
    expect(arg.properties).not.toHaveProperty('$ai_input');
    expect(arg.properties).not.toHaveProperty('$ai_output');
  });

  it('is a no-op when disabled', () => {
    const service = makeService();
    expect(() =>
      service.captureAiGeneration('u', {
        model: 'm',
        artifact: 'letter',
        latencyMs: 1,
        isError: true,
      }),
    ).not.toThrow();
  });
});
