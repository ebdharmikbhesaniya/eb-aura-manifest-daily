import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AnalyticsService } from '../analytics/analytics.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { NotificationsService } from './notifications.service';

/**
 * Push delivery (11 §1).
 *
 * The cases here are the ones that decide whether a notification she is owed
 * ever arrives — the ORDER of the token lookup and the dedupe claim, and what
 * counts as "already sent". Both are invisible in the happy path and both cost
 * a real notification when they are wrong.
 */
describe('NotificationsService', () => {
  let service: NotificationsService;

  /** Rows in `notification_sends`, keyed the way the unique index is. */
  let sends: Set<string>;
  /** Active push tokens for the user. */
  let tokens: string[];
  /** Set to make the claim insert fail with something other than a duplicate. */
  let claimError: { code?: string; message: string } | null;
  let fetchCalls: number;

  const send = () =>
    service.send({
      userId: 'user-1',
      kind: 'milestone',
      dedupeKey: 'd7',
      input: { name: 'Jenny', momentId: 'moment-1', milestoneDay: 7 },
    });

  beforeEach(async () => {
    sends = new Set();
    tokens = ['ExponentPushToken[abc]'];
    claimError = null;
    fetchCalls = 0;

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    global.fetch = jest.fn(async () => {
      fetchCalls += 1;
      return { json: async () => ({ data: [{ status: 'ok' }] }) } as never;
    }) as never;

    const supabase = {
      from: (table: string) => {
        if (table === 'notification_sends') {
          return {
            insert: (row: { user_id: string; kind: string; dedupe_key: string }) => {
              if (claimError) return Promise.resolve({ error: claimError });

              const key = `${row.user_id}|${row.kind}|${row.dedupe_key}`;
              if (sends.has(key)) {
                return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
              }
              sends.add(key);
              return Promise.resolve({ error: null });
            },
          };
        }

        // notification_tokens
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: () => builder,
          update: () => builder,
          in: () => Promise.resolve({ error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            resolve({ data: tokens.map((t) => ({ expo_push_token: t })), error: null }),
        };
        return builder;
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
        { provide: AnalyticsService, useValue: { capture: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends when she has a device registered', async () => {
    await expect(send()).resolves.toEqual({ sent: true });
    expect(fetchCalls).toBe(1);
  });

  it('is idempotent — a second send for the same key is a no-op', async () => {
    await send();

    await expect(send()).resolves.toEqual({ sent: false, reason: 'already_sent' });
    expect(fetchCalls).toBe(1);
  });

  /**
   * The regression this suite exists for.
   *
   * The claim used to be inserted BEFORE the token lookup, so a user with no
   * registered device consumed her dedupe key and got `no_tokens`. For an
   * arrival that is harmless — tomorrow is a new date key — but `milestone`,
   * `winback` and `trial_reminder` are keyed once per lifetime, so someone who
   * had not yet granted notification permission never received them, even after
   * granting it.
   */
  it('does not consume the dedupe key when she has no device yet', async () => {
    tokens = [];

    await expect(send()).resolves.toEqual({ sent: false, reason: 'no_tokens' });
    expect(sends.size).toBe(0);

    // She grants permission and registers. The note she is owed still arrives.
    tokens = ['ExponentPushToken[abc]'];
    await expect(send()).resolves.toEqual({ sent: true });
  });

  it('reports a real database failure rather than calling it already-sent', async () => {
    // Treating every claim error as a duplicate let an outage read as a
    // successful de-duplication, so nothing retried and nothing was logged.
    claimError = { code: '08006', message: 'connection failure' };

    await expect(send()).resolves.toEqual({ sent: false, reason: 'claim_failed' });
    expect(fetchCalls).toBe(0);
  });

  it('chunks a large device list rather than posting one oversized batch', async () => {
    // Expo rejects an oversized batch outright, which would drop the note for
    // every one of her devices rather than some.
    tokens = Array.from({ length: 250 }, (_, i) => `ExponentPushToken[${i}]`);

    await expect(send()).resolves.toEqual({ sent: true });
    expect(fetchCalls).toBe(3); // 100 + 100 + 50
  });
});
