import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { CreditsService, weekStartFor } from './credits.service';

/**
 * Credits (Phase 7 test list: "credit spend/refund — error paths don't consume").
 *
 * That rule is the point of the suite. Product 09 §9.2 promises "Error: retry,
 * credit not consumed", and a cap that eats a credit on a failure stops reading
 * as pacing and starts reading as theft — from the users most likely to be
 * paying attention to what they are getting for their money.
 *
 * The `usage_credits` double below is STATEFUL rather than a bare mock, because
 * the property that matters most here is a concurrency one: reserving is a
 * compare-and-swap, and a fake that records calls without holding a value
 * cannot tell a correct swap from the read-then-overwrite it replaced. The
 * "two requests race" case is the whole reason this shape exists.
 */
describe('CreditsService', () => {
  let service: CreditsService;
  let momentRow: { id: string; refine_of: string | null } | null;
  let children: { id: string }[];

  /** The one `usage_credits` row this suite models. `null` = no row for the week. */
  let credits: { week_start: string; manifest_used: number } | null;
  /** Writes attempted against it, so "did not write" is assertable. */
  let writes: { kind: 'insert' | 'update'; value: number }[];
  /** Set to fail the next write, for the fail-closed case. */
  let writeError: { code?: string; message: string } | null;
  /**
   * Runs once, immediately before a guarded update evaluates its predicate —
   * the hook that simulates another request winning the race.
   */
  let interleave: (() => void) | null;

  const NOW = new Date('2026-07-22T12:00:00Z'); // a Wednesday
  const WEEK = '2026-07-20';

  beforeEach(async () => {
    momentRow = { id: 'moment-1', refine_of: null };
    children = [];
    credits = null;
    writes = [];
    writeError = null;
    interleave = null;
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    /** The `usage_credits` half of the fake: insert, guarded update, read. */
    const usageCredits = () => ({
      insert: (row: { manifest_used: number; week_start: string }) => {
        writes.push({ kind: 'insert', value: row.manifest_used });
        if (writeError) return Promise.resolve({ error: writeError });
        // A row already there is a unique violation, exactly as Postgres reports it.
        if (credits) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
        credits = { week_start: row.week_start, manifest_used: row.manifest_used };
        return Promise.resolve({ error: null });
      },

      update: (patch: { manifest_used: number }) => {
        writes.push({ kind: 'update', value: patch.manifest_used });
        let expected: number | null = null;

        const guarded: Record<string, unknown> = {
          eq: (column: string, value: unknown) => {
            if (column === 'manifest_used') expected = value as number;
            return guarded;
          },
          // `.select()` closes the chain and reports the rows actually matched —
          // zero means the guard did not hold and someone else moved the value.
          select: () => {
            interleave?.();
            interleave = null;

            if (writeError) return Promise.resolve({ data: null, error: writeError });
            if (!credits || credits.manifest_used !== expected) {
              return Promise.resolve({ data: [], error: null });
            }
            credits = { ...credits, manifest_used: patch.manifest_used };
            return Promise.resolve({ data: [{ manifest_used: patch.manifest_used }], error: null });
          },
        };

        return guarded;
      },

      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: credits ? { manifest_used: credits.manifest_used } : null,
                error: null,
              }),
          }),
        }),
      }),
    });

    /** The `moments` half, for `canRefine`. */
    const moments = () => ({
      select: () => ({
        eq: (_column: string, value: string) => ({
          maybeSingle: () => Promise.resolve({ data: momentRow, error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            resolve({ data: value === 'moment-1' ? children : [], error: null }),
        }),
      }),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CreditsService,
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            from: (table: string) => (table === 'moments' ? moments() : usageCredits()),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => ({ MANIFEST_WEEKLY_LIMIT: 3, REFINE_PER_MOMENT: 1 })[key],
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CreditsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('weekStartFor', () => {
    it('returns the Monday of the week', () => {
      expect(weekStartFor(new Date('2026-07-22T12:00:00Z'))).toBe('2026-07-20');
    });

    it('treats Monday itself as the start', () => {
      expect(weekStartFor(new Date('2026-07-20T00:00:00Z'))).toBe('2026-07-20');
    });

    it('keeps Sunday in the week that just ended, not the next one', () => {
      // ISO weeks end on Sunday; rolling it forward would hand out a second
      // allowance a day early, every week.
      expect(weekStartFor(new Date('2026-07-26T23:59:00Z'))).toBe('2026-07-20');
    });

    it('rolls to a new week on the following Monday', () => {
      expect(weekStartFor(new Date('2026-07-27T00:00:00Z'))).toBe('2026-07-27');
    });

    it('crosses a month boundary correctly', () => {
      expect(weekStartFor(new Date('2026-08-01T12:00:00Z'))).toBe('2026-07-27');
    });
  });

  describe('check', () => {
    it('reports a full allowance for a fresh week', async () => {
      credits = null;

      await expect(service.check('user-1', NOW)).resolves.toEqual({
        allowed: true,
        used: 0,
        limit: 3,
        remaining: 3,
      });
    });

    it('counts what she has already spent', async () => {
      credits = { week_start: WEEK, manifest_used: 2 };

      await expect(service.check('user-1', NOW)).resolves.toMatchObject({
        allowed: true,
        remaining: 1,
      });
    });

    it('refuses once the allowance is gone', async () => {
      credits = { week_start: WEEK, manifest_used: 3 };

      await expect(service.check('user-1', NOW)).resolves.toMatchObject({
        allowed: false,
        remaining: 0,
      });
    });

    it('does not spend anything just by checking', async () => {
      await service.check('user-1', NOW);

      expect(writes).toEqual([]);
    });
  });

  describe('spend', () => {
    it('reserves a credit and reports what is left', async () => {
      credits = { week_start: WEEK, manifest_used: 1 };

      await expect(service.spend('user-1', NOW)).resolves.toEqual({
        allowed: true,
        used: 2,
        limit: 3,
        remaining: 1,
      });
      expect(credits).toEqual({ week_start: WEEK, manifest_used: 2 });
    });

    it("creates the week's row on her first spend", async () => {
      credits = null;

      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({ allowed: true, used: 1 });
      expect(credits).toEqual({ week_start: WEEK, manifest_used: 1 });
    });

    it('refuses without writing when she is out', async () => {
      credits = { week_start: WEEK, manifest_used: 3 };

      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({ allowed: false });
      expect(writes).toEqual([]);
    });

    it('fails CLOSED on a database error rather than letting everything through', async () => {
      credits = { week_start: WEEK, manifest_used: 1 };
      writeError = { message: 'deadlock' };

      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({ allowed: false });
    });

    /**
     * The bug this whole compare-and-swap exists for.
     *
     * The previous implementation read `used`, then upserted `used + 1`, and
     * claimed in its own comment that ordering closed this race. It did not:
     * both requests read the same value and both wrote the same value, so the
     * second manifest was free. The interleave below is that exact schedule —
     * another request lands between this one's read and its write.
     */
    it('does not double-spend when two requests race on the same credit', async () => {
      credits = { week_start: WEEK, manifest_used: 2 }; // one left of three

      interleave = () => {
        credits = { week_start: WEEK, manifest_used: 3 }; // the other request won
      };

      // It re-reads, sees the allowance is now gone, and refuses rather than
      // overwriting the winner's spend back down to 3.
      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({
        allowed: false,
        used: 3,
        remaining: 0,
      });
      expect(credits).toEqual({ week_start: WEEK, manifest_used: 3 });
    });

    it('retries onto the new value when a race still leaves her a credit', async () => {
      credits = { week_start: WEEK, manifest_used: 0 };

      interleave = () => {
        credits = { week_start: WEEK, manifest_used: 1 };
      };

      // Loses the first swap, re-reads 1, and lands on 2 — never on 1, which is
      // what an unconditional write would have produced.
      await expect(service.spend('user-1', NOW)).resolves.toMatchObject({
        allowed: true,
        used: 2,
      });
      expect(credits).toEqual({ week_start: WEEK, manifest_used: 2 });
    });
  });

  describe('refund — the rule that keeps a cap honest', () => {
    it('gives the credit back', async () => {
      credits = { week_start: WEEK, manifest_used: 2 };

      await service.refund('user-1', NOW);

      expect(credits).toEqual({ week_start: WEEK, manifest_used: 1 });
    });

    it('does nothing when nothing has been spent', async () => {
      credits = { week_start: WEEK, manifest_used: 0 };

      await service.refund('user-1', NOW);

      expect(writes).toEqual([]);
    });

    it('never mints a credit she was not given', async () => {
      // A double refund — a retry that fails twice — must not go negative and
      // hand her a free allowance.
      credits = null;

      await service.refund('user-1', NOW);

      expect(writes).toEqual([]);
      expect(credits).toBeNull();
    });

    it('gives back exactly one credit when two refunds race', async () => {
      credits = { week_start: WEEK, manifest_used: 2 };

      interleave = () => {
        credits = { week_start: WEEK, manifest_used: 1 }; // the other refund landed
      };

      await service.refund('user-1', NOW);

      // Re-reads 1 and decrements to 0 — two failures, two credits back. A
      // read-then-write pair would have written 1 twice and returned only one.
      expect(credits).toEqual({ week_start: WEEK, manifest_used: 0 });
    });

    it('round-trips: spend then refund leaves her where she started', async () => {
      credits = { week_start: WEEK, manifest_used: 1 };

      await service.spend('user-1', NOW);
      await service.refund('user-1', NOW);

      expect(credits).toEqual({ week_start: WEEK, manifest_used: 1 });
    });
  });

  describe('canRefine — one per moment (product 09 §9.1)', () => {
    it('allows the first refine of an original moment', async () => {
      momentRow = { id: 'moment-1', refine_of: null };
      children = [];

      await expect(service.canRefine('moment-1')).resolves.toBe(true);
    });

    it('refuses a second refine of the same moment', async () => {
      children = [{ id: 'moment-2' }];

      await expect(service.canRefine('moment-1')).resolves.toBe(false);
    });

    it('refuses to refine a refinement — the cap is on the lineage, not the hop', async () => {
      // Otherwise a chain would be an unbounded budget, one refine at a time.
      momentRow = { id: 'moment-2', refine_of: 'moment-1' };

      await expect(service.canRefine('moment-2')).resolves.toBe(false);
    });

    it('refuses for a moment that does not exist', async () => {
      momentRow = null;

      await expect(service.canRefine('nope')).resolves.toBe(false);
    });
  });
});
