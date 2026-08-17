import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/**
 * The week a credit belongs to: the Monday of that ISO week, in UTC.
 *
 * Pure and exported so the boundary is testable. UTC rather than her local
 * timezone is a deliberate simplification — a credit week is an accounting
 * period, not an experience, and a user who travels should not be handed a
 * fresh allowance by crossing a date line.
 */
export function weekStartFor(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // getUTCDay: 0 = Sunday. Shift so Monday is day 0.
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

export interface CreditCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Retries for the spend/refund compare-and-swap.
 *
 * Contention here is one user double-tapping, not a thundering herd, so a
 * handful of attempts is generous. Spinning further would hold a request open
 * on a database that is clearly busy.
 */
const CAS_MAX_ATTEMPTS = 5;

/** Postgres unique-violation — the week's row was created by a racing request. */
function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key|already exists/i.test(error.message ?? '');
}

/**
 * Manifest Anything credits and refine caps (12 §4, product 09 §9.2).
 *
 * The rule that shapes this whole file: **an error must never consume a
 * credit.** Product 09 §9.2 states it directly ("Error: retry, credit not
 * consumed"), and it is the difference between a cap that reads as pacing and
 * one that reads as theft. So a spend is recorded up front — to close the race
 * where two requests both see the last credit — and explicitly refunded on
 * every failure path.
 */
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** How many manifests she has left this week, without spending one. */
  async check(userId: string, now: Date = new Date()): Promise<CreditCheck> {
    const limit = this.config.get('MANIFEST_WEEKLY_LIMIT', { infer: true });
    const used = await this.usedThisWeek(userId, now);

    return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) };
  }

  /**
   * Reserves a credit. Returns `allowed: false` without spending when she is out.
   *
   * Reserved BEFORE the generation runs, not after it succeeds: two requests
   * arriving together would otherwise both read "1 remaining" and both proceed.
   * The cost of this ordering is that failures must refund — which they do.
   *
   * The reservation is a COMPARE-AND-SWAP, not a read-then-upsert. The previous
   * version read `used`, then upserted `used + 1`, and its comment claimed that
   * closed the two-requests-see-the-last-credit race. It did not: both requests
   * read the same `used` and both wrote the same value, so the second spend was
   * free. Every write below is conditional on the value the read observed, and a
   * lost race just retries against the new value.
   */
  async spend(userId: string, now: Date = new Date()): Promise<CreditCheck> {
    const limit = this.config.get('MANIFEST_WEEKLY_LIMIT', { infer: true });

    for (let attempt = 0; attempt < CAS_MAX_ATTEMPTS; attempt++) {
      const { used, exists } = await this.readCredits(userId, now);

      if (used >= limit) {
        return { allowed: false, used, limit, remaining: 0 };
      }

      const swapped = await this.compareAndSwap(userId, now, { used, exists }, used + 1);

      // A concurrent request moved the counter under us. Re-read and try again
      // rather than overwriting its spend.
      if (swapped === 'conflict') continue;

      if (swapped === 'error') {
        // Failing open here would let an unlimited number through on a database
        // blip; failing closed costs her one manifest she can retry.
        return { allowed: false, used, limit, remaining: Math.max(0, limit - used) };
      }

      return {
        allowed: true,
        used: used + 1,
        limit,
        remaining: Math.max(0, limit - (used + 1)),
      };
    }

    // Losing the swap this many times in a row is contention we should not spin
    // on. Failing closed costs her a retry; failing open costs a free manifest.
    this.logger.error(`Credit spend gave up after ${CAS_MAX_ATTEMPTS} contended attempts`);
    const used = await this.usedThisWeek(userId, now);
    return { allowed: false, used, limit, remaining: Math.max(0, limit - used) };
  }

  /**
   * Returns a reserved credit after a failed generation (product 09 §9.2).
   *
   * Clamped at zero so a double refund — a retry that fails twice, a webhook
   * replay — can never mint credits she was not given. Compare-and-swap for the
   * same reason `spend` is: two refunds racing on a read-then-write would both
   * write `used - 1` and give back one credit for two failures.
   */
  async refund(userId: string, now: Date = new Date()): Promise<void> {
    for (let attempt = 0; attempt < CAS_MAX_ATTEMPTS; attempt++) {
      const { used, exists } = await this.readCredits(userId, now);
      if (used <= 0) return;

      const swapped = await this.compareAndSwap(userId, now, { used, exists }, used - 1);
      if (swapped === 'conflict') continue;

      if (swapped === 'error') this.logger.error('Credit refund failed');
      return;
    }

    this.logger.error(`Credit refund gave up after ${CAS_MAX_ATTEMPTS} contended attempts`);
  }

  /**
   * Moves `manifest_used` from `expected.used` to `next`, only if it is still
   * `expected.used`.
   *
   * Two shapes, because the week's first spend has no row yet:
   *  - no row → INSERT. A unique violation means another request created it
   *    first, which is a conflict, not a failure.
   *  - row → UPDATE guarded by `.eq('manifest_used', expected.used)`. Zero rows
   *    affected means someone else moved it; that is the conflict signal.
   *
   * The branch is on ROW EXISTENCE, never on `used === 0`. A fully-refunded week
   * leaves a row holding 0, and branching on the value would send every later
   * spend down the insert path, where it conflicts forever — locking her out of
   * her allowance for the rest of the week.
   */
  private async compareAndSwap(
    userId: string,
    now: Date,
    expected: { used: number; exists: boolean },
    next: number,
  ): Promise<'ok' | 'conflict' | 'error'> {
    const weekStart = weekStartFor(now);

    if (!expected.exists) {
      const { error } = await this.supabase
        .from('usage_credits')
        .insert({ user_id: userId, week_start: weekStart, manifest_used: next });

      if (!error) return 'ok';
      if (isUniqueViolation(error)) return 'conflict';

      this.logger.error(`Credit insert failed: ${error.message}`);
      return 'error';
    }

    const { data, error } = await this.supabase
      .from('usage_credits')
      .update({ manifest_used: next })
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('manifest_used', expected.used)
      .select('manifest_used');

    if (error) {
      this.logger.error(`Credit update failed: ${error.message}`);
      return 'error';
    }

    return (data?.length ?? 0) > 0 ? 'ok' : 'conflict';
  }

  /**
   * Whether this moment may still be refined (product 09 §9.1: 1 per moment).
   *
   * Counts the refine LINEAGE via `refine_of` rather than a flag, so refining a
   * refinement is blocked too — the cap is on the original moment, and a chain
   * would otherwise be an unbounded budget one hop at a time.
   */
  async canRefine(momentId: string): Promise<boolean> {
    const limit = this.config.get('REFINE_PER_MOMENT', { infer: true });

    const { data: moment } = await this.supabase
      .from('moments')
      .select('id, refine_of')
      .eq('id', momentId)
      .maybeSingle();

    if (!moment) return false;

    // A moment that is itself a refinement is at the end of its lineage.
    if (moment.refine_of) return false;

    const { data: children } = await this.supabase
      .from('moments')
      .select('id')
      .eq('refine_of', momentId);

    return (children?.length ?? 0) < limit;
  }

  private async usedThisWeek(userId: string, now: Date): Promise<number> {
    return (await this.readCredits(userId, now)).used;
  }

  /**
   * The week's counter, and whether a row exists to hold it.
   *
   * `exists` is what `compareAndSwap` branches on — a row holding 0 and no row
   * at all read identically through `used` alone, and they need opposite writes.
   */
  private async readCredits(userId: string, now: Date): Promise<{ used: number; exists: boolean }> {
    const { data } = await this.supabase
      .from('usage_credits')
      .select('manifest_used')
      .eq('user_id', userId)
      .eq('week_start', weekStartFor(now))
      .maybeSingle();

    return { used: data?.manifest_used ?? 0, exists: data !== null && data !== undefined };
  }
}
