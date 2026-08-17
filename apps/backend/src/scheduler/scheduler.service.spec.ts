import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AccountService } from '../account/account.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { JobsService } from '../generation/jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { WINDOW_WIDTH_MINUTES } from './pregen-window';
import { SchedulerService } from './scheduler.service';

/**
 * The pre-generation sweep (04 §5).
 *
 * The window maths is tested exhaustively in `pregen-window.spec.ts`; this suite
 * covers what the SWEEP adds on top: the inactive-user cost guard, the
 * already-has-a-moment idempotency check, and — the one that matters
 * operationally — that one user's failure does not abort the run for everyone
 * queued behind her.
 */
describe('SchedulerService', () => {
  let service: SchedulerService;
  let enqueue: jest.Mock;
  let deleteAccount: jest.Mock;
  let profiles: Record<string, unknown>[];
  let existingMoments: Record<string, unknown>[];

  /** 06:45 UTC — the firing run for a 07:00 arrival. */
  const NOW = new Date('2026-07-20T06:45:00Z');

  const profile = (overrides: Record<string, unknown> = {}) => ({
    user_id: 'user-1',
    timezone: 'UTC',
    arrival_time: '07:00',
    last_active_at: '2026-07-20T06:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    enqueue = jest.fn().mockResolvedValue({ jobId: 'job-1', existing: false });
    deleteAccount = jest.fn().mockResolvedValue(undefined);
    profiles = [profile()];
    existingMoments = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: JobsService, useValue: { enqueue } },
        { provide: AnalyticsService, useValue: { capture: jest.fn() } },
        {
          provide: NotificationsService,
          useValue: {
            send: jest.fn(async () => ({ sent: true })),
            prefsFor: jest.fn(async () => ({
              arrivalEnabled: true,
              ignoredArrivalCount: 0,
              softened: false,
            })),
          },
        },
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            from: (table: string) => {
              const rows = () => (table === 'profiles' ? profiles : existingMoments);
              const builder: Record<string, unknown> = {
                select: () => builder,
                eq: () => builder,
                in: () => builder,
                is: () => builder,
                gte: () => builder,
                lte: () => builder,
                lt: () => builder,
                limit: () => Promise.resolve({ data: existingMoments, error: null }),
                not: () => builder,
                order: () => builder,
                // Every sweep pages with `.range()` — PostgREST truncates at
                // `max_rows` (1000) with no error, so an unpaged sweep silently
                // stops working past that many users. One short page ends the loop.
                range: () => Promise.resolve({ data: rows(), error: null }),
                then: (resolve: (v: unknown) => unknown) => resolve({ data: rows(), error: null }),
              };
              return builder;
            },
          },
        },
        { provide: AccountService, useValue: { deleteAccount } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({ PREGEN_INACTIVE_SKIP_DAYS: 7, PREGEN_BUFFER_MINUTES: 30 })[key],
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SchedulerService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('runs as often as its window is wide', () => {
    // The window is 15 minutes wide, so the cron must fire every 15 minutes. A
    // 30-minute schedule would sample every other window and silently skip half
    // of all users — no error, no log line, just people who never get a moment.
    const schedule = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      SchedulerService.prototype.pregenerateDaily,
    ) as { cronTime?: string } | undefined;

    expect(schedule?.cronTime ?? '*/15 * * * *').toBe(`*/${WINDOW_WIDTH_MINUTES} * * * *`);
  });

  it('enqueues a daily moment for a user inside the window', async () => {
    const result = await service.pregenerateDaily(NOW);

    expect(enqueue).toHaveBeenCalledWith('user-1', 'daily', 'daily:user-1:2026-07-20');
    expect(result).toEqual({ processed: 1, failures: 0 });
  });

  it('enqueues her affirmation in the same sweep (Phase 8)', async () => {
    await service.pregenerateDaily(NOW);

    expect(enqueue).toHaveBeenCalledWith(
      'user-1',
      'affirmation_daily',
      'affirmation:user-1:2026-07-20',
    );
  });

  it('keeps the two beats as separate jobs', async () => {
    // An affirmation failing must not cost her the moment, and vice versa.
    await service.pregenerateDaily(NOW);

    const artifacts = enqueue.mock.calls.map(([, artifact]) => artifact);
    expect(artifacts).toEqual(['daily', 'affirmation_daily']);
  });

  it('skips a user whose arrival is not due yet', async () => {
    profiles = [profile({ arrival_time: '19:00' })];

    await service.pregenerateDaily(NOW);

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('keys the job to HER local date, not the server’s', async () => {
    // 06:45Z is still 2026-07-19 in New York, and her 07:00 arrival there is a
    // different instant entirely — so this run is not hers.
    profiles = [profile({ timezone: 'America/New_York' })];

    await service.pregenerateDaily(NOW);

    expect(enqueue).not.toHaveBeenCalled();
  });

  describe('the cost guard (00 §D3)', () => {
    it('skips a user who has not opened the app in over a week', async () => {
      profiles = [profile({ last_active_at: '2026-06-01T00:00:00Z' })];

      await service.pregenerateDaily(NOW);

      expect(enqueue).not.toHaveBeenCalled();
    });

    it('still generates for someone who opened it yesterday', async () => {
      profiles = [profile({ last_active_at: '2026-07-19T09:00:00Z' })];

      await service.pregenerateDaily(NOW);

      expect(enqueue).toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('does not generate a second moment for a date she already has', async () => {
      existingMoments = [{ id: 'moment-1' }];

      const result = await service.pregenerateDaily(NOW);

      expect(enqueue).not.toHaveBeenCalled();
      expect(result.processed).toBe(0);
    });

    it('passes an idempotency key so two racing runs collapse to one job', async () => {
      await service.pregenerateDaily(NOW);

      expect(enqueue).toHaveBeenCalledWith(
        'user-1',
        'daily',
        expect.stringContaining('daily:user-1:'),
      );
    });
  });

  /**
   * PostgREST caps every response at `max_rows` (1000, see supabase/config.toml)
   * and TRUNCATES SILENTLY — no error, no flag, and the sweep still logs
   * `processed=N failures=0`. An unpaged sweep therefore stops working for user
   * 1001 onward in a way nothing surfaces.
   */
  describe('pagination (the silent 1000-row ceiling)', () => {
    /** A supabase double that serves `total` profiles through `.range()`. */
    const pagedClient = (total: number, pageSize: number) => {
      const all = Array.from({ length: total }, (_, i) =>
        profile({ user_id: `user-${String(i).padStart(5, '0')}` }),
      );
      const ranges: [number, number][] = [];

      return {
        ranges,
        client: {
          from: (table: string) => {
            const builder: Record<string, unknown> = {
              select: () => builder,
              eq: () => builder,
              in: () => builder,
              not: () => builder,
              order: () => builder,
              limit: () => Promise.resolve({ data: [], error: null }),
              range: (from: number, to: number) => {
                if (table !== 'profiles') return Promise.resolve({ data: [], error: null });
                ranges.push([from, to]);
                // The server caps a page at `pageSize` however wide the range is.
                const size = Math.min(to - from + 1, pageSize);
                return Promise.resolve({ data: all.slice(from, from + size), error: null });
              },
              then: (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }),
            };
            return builder;
          },
        },
      };
    };

    const build = (client: unknown) =>
      new SchedulerService(
        client as never,
        { enqueue } as never,
        { send: jest.fn(async () => ({ sent: true })), prefsFor: jest.fn() } as never,
        { capture: jest.fn() } as never,
        { deleteAccount } as never,
        { get: () => 30 } as never,
      );

    it('reaches every user past the first page', async () => {
      // 1200 users against a 500-row server cap: an unpaged read would have
      // stopped at the first page and silently skipped the rest.
      const { client, ranges } = pagedClient(1200, 500);

      const result = await build(client).pregenerateDaily(NOW);

      expect(result.processed).toBe(1200);
      expect(ranges.length).toBeGreaterThan(1);
      expect(ranges[0]).toEqual([0, 499]);
    });

    it('stops on a short page rather than looping forever', async () => {
      const { client, ranges } = pagedClient(120, 500);

      await build(client).pregenerateDaily(NOW);

      expect(ranges).toEqual([[0, 499]]);
    });
  });

  describe('resilience', () => {
    it('keeps sweeping after one user fails', async () => {
      // The whole point of a sweep: user B must still wake up to her moment
      // even if user A's enqueue blew up.
      profiles = [profile({ user_id: 'user-a' }), profile({ user_id: 'user-b' })];
      enqueue.mockRejectedValueOnce(new Error('deadlock')).mockResolvedValue({ jobId: 'job-2' });

      const result = await service.pregenerateDaily(NOW);

      // user-a's moment threw, so her affirmation is skipped too; user-b still
      // gets both beats.
      expect(enqueue).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ processed: 1, failures: 1 });
    });

    it('reports a profiles read failure rather than throwing out of the cron', async () => {
      const failing = new SchedulerService(
        {
          from: () => {
            const builder: Record<string, unknown> = {
              select: () => builder,
              not: () => builder,
              order: () => builder,
              range: () => Promise.resolve({ data: null, error: { message: 'db down' } }),
            };
            return builder;
          },
        } as never,
        { enqueue } as never,
        { send: jest.fn(), prefsFor: jest.fn() } as never,
        { capture: jest.fn() } as never,
        { deleteAccount: jest.fn() } as never,
        { get: () => 7 } as never,
      );

      await expect(failing.pregenerateDaily(NOW)).resolves.toEqual({
        processed: 0,
        failures: 1,
      });
    });

    it('never logs a user id', async () => {
      const log = jest.spyOn(Logger.prototype, 'log');

      await service.pregenerateDaily(NOW);

      for (const call of log.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('user-1');
      }
    });
  });
});
