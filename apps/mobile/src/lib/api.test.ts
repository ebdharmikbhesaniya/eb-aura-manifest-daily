import { z } from 'zod';

import { api, ApiRequestError, request } from './api';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { access_token: 'token' } } })),
      refreshSession: jest.fn(async () => ({ data: { session: null }, error: new Error('no') })),
    },
  },
}));

function reply(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    // The real `Response.json()` REJECTS on an empty body — that rejection is
    // the whole reason this suite exists, so the fake has to reproduce it
    // rather than resolve undefined.
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  } as unknown as Response;
}

describe('api request parsing', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  /**
   * Account deletion answers 204 with no body. This threw
   * "Expected object, received null" on device, which silently skipped the
   * sign-out and local wipe chained behind it — leaving the device signed in,
   * holding her data, against a user the server had already deleted.
   */
  it('treats a 204 with no body as success, not a schema failure', async () => {
    fetchMock.mockResolvedValue(reply(204));

    await expect(
      request({ path: '/v1/account/delete', method: 'POST', body: {}, schema: z.object({}) }),
    ).resolves.toEqual({});
  });

  it('deleteAccount specifically survives its own 204', async () => {
    fetchMock.mockResolvedValue(reply(204));

    await expect(api.deleteAccount()).resolves.toBeDefined();
  });

  it('still parses a normal JSON body', async () => {
    fetchMock.mockResolvedValue(reply(200, { status: 'ok' }));

    await expect(
      request({ path: '/v1/health', schema: z.object({ status: z.string() }) }),
    ).resolves.toEqual({ status: 'ok' });
  });

  /** The narrowing that matters: an empty 200 is NOT a no-content response. */
  it('still fails loudly when a 200 body is unreadable', async () => {
    fetchMock.mockResolvedValue(reply(200));

    await expect(
      request({ path: '/v1/health', schema: z.object({ status: z.string() }) }),
    ).rejects.toThrow();
  });

  it('reports a server error rather than a parse error', async () => {
    fetchMock.mockResolvedValue(
      reply(402, { error: { key: 'entitlement_required', message: 'premium' } }),
    );

    await expect(
      request({ path: '/v1/generation/moment', method: 'POST', body: {}, schema: z.object({}) }),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});
