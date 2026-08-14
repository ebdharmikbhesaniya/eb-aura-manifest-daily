import { BadRequestException } from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost(userId?: string) {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res = { status };
  const req = { user: userId ? { id: userId } : undefined };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  } as never;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('reports a non-HttpException (500) to PostHog with the user id', () => {
    const analytics = { captureException: jest.fn() } as never;
    const filter = new AllExceptionsFilter(analytics);
    const { host, status } = mockHost('user_1');

    filter.catch(new Error('kaboom'), host);

    expect(
      (analytics as unknown as { captureException: jest.Mock }).captureException,
    ).toHaveBeenCalledWith('user_1', expect.any(Error));
    expect(status).toHaveBeenCalledWith(500);
  });

  it('does NOT report an expected 4xx HttpException', () => {
    const analytics = { captureException: jest.fn() } as never;
    const filter = new AllExceptionsFilter(analytics);
    const { host, status } = mockHost('user_1');

    filter.catch(new BadRequestException('bad input'), host);

    expect(
      (analytics as unknown as { captureException: jest.Mock }).captureException,
    ).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
  });

  it('does not leak the internal error message to the client on a 500', () => {
    const analytics = { captureException: jest.fn() } as never;
    const filter = new AllExceptionsFilter(analytics);
    const { host, json } = mockHost();

    filter.catch(new Error('secret internal detail'), host);

    expect(JSON.stringify(json.mock.calls[0]?.[0])).not.toContain('secret internal detail');
  });
});
