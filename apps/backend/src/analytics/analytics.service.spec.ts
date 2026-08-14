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
