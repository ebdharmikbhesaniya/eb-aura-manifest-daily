import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';

import { ApiException } from '../common/api.exception';
import { hashUserId } from '../observability/logger.config';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/** Private bucket holding generated audio: `audio/{user_id}/{moment_id}.mp3` (02 §6). */
const AUDIO_BUCKET = 'audio';

/**
 * Objects fetched per `list` call.
 *
 * `list()` DEFAULTS TO 100 and pages silently — there is no error and no flag on
 * a truncated result. A daily user writes two objects per moment (voice +
 * ambient mix), so she crosses the default in about seven weeks, after which an
 * unpaged wipe would leave every later recording in the bucket with no owner row
 * left to identify it. The limit is stated explicitly here so the pagination
 * below can never be "optimised" back into a single call.
 */
const LIST_PAGE_SIZE = 100;

/** Objects removed per `remove` call — the API takes a bounded array of paths. */
const REMOVE_BATCH_SIZE = 100;

/**
 * Hard stop on the delete-then-relist loop.
 *
 * The loop relists at offset 0 and relies on the previous page actually being
 * gone. If a remove ever reported success without deleting, that assumption
 * turns into an infinite loop inside a request. 200 pages is far past any real
 * account (20,000 objects ≈ 27 years of daily moments), so hitting it means the
 * assumption broke — which is a failure worth surfacing, not spinning on.
 */
const MAX_LIST_PAGES = 200;

/**
 * Full account deletion (03 §5, 14 §6). "Delete means delete" is a brand promise
 * (product 18 §4), not a best effort.
 *
 * Order matters. Storage objects go FIRST: Postgres cascades rows on
 * `auth.users` delete, but it cannot reach into Storage (02 §6). Delete the user
 * first and the audio is orphaned with no owner left to identify it.
 *
 * Steps 1–2 are synchronous — the response only returns once her data is
 * actually gone. Steps 3–4 (RevenueCat, PostHog) are queued with retry and are
 * no-ops until those phases exist.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    // Logs identify by hash — a raw uuid here joins to someone's whole history (04 §7).
    const userRef = hashUserId(userId);
    this.logger.log(`Account deletion started for ${userRef}`);

    await this.deleteAudioObjects(userId, userRef);

    // 2. Cascades every user table (02 §8).
    const { error } = await this.supabase.auth.admin.deleteUser(userId);
    if (error) {
      // Already gone: the caller's JWT still verifies for its remaining lifetime,
      // so a retry on a flaky connection lands here. That is success, not failure —
      // the desired state holds. Anything else is a real failure.
      if (isUserNotFound(error)) {
        this.logger.log(`Account already deleted for ${userRef}; treating retry as success`);
        return;
      }
      this.logger.error(`Auth deletion failed for ${userRef}: ${error.message}`);
      throw ApiException.internal('Account deletion failed');
    }

    // 3. RevenueCat subscriber delete (03 §5 step 3).
    //
    // No longer deferrable: RevenueCat went live at Phase 10, so leaving this
    // out meant a deleted account kept a subscriber record at a third party —
    // "delete means delete" (product 18) has to include the vendors we handed
    // her id to. Failure is logged, not thrown: her Supabase data is already
    // gone, and refusing the request now would be worse than an orphan record
    // we can sweep.
    await this.deleteRevenueCatSubscriber(userId, userRef);

    // 4. PostHog person deletion belongs with Phase 11, which owns that
    // integration. Analytics holds only pseudonymous structural events (13 §2),
    // so the exposure is materially smaller than RevenueCat's.

    this.logger.log(`Account deletion completed for ${userRef}`);
  }

  /**
   * Deletes her RevenueCat subscriber (03 §5 step 3).
   *
   * RC's `app_user_id` IS her Supabase id (03 §4), so no lookup is needed. An
   * unset key means RevenueCat was never configured in this environment, which
   * is the normal local/dev case — not an error.
   */
  private async deleteRevenueCatSubscriber(userId: string, userRef: string): Promise<void> {
    const apiKey = this.config.get('REVENUECAT_SECRET_KEY', { infer: true });
    if (!apiKey) return;

    try {
      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${apiKey}` } },
      );

      // 404 means there was never a subscriber — already the desired state.
      if (!response.ok && response.status !== 404) {
        this.logger.error(`RevenueCat delete failed for ${userRef} (${response.status})`);
      }
    } catch (error) {
      this.logger.error(
        `RevenueCat delete errored for ${userRef} (${error instanceof Error ? error.name : 'unknown'})`,
      );
    }
  }

  /**
   * Storage has no cascade, so the prefix is listed and removed explicitly.
   * A failure here is fatal to the request on purpose: silently deleting the auth
   * user while her audio survives would leave unreachable recordings of her life
   * and quietly break the promise.
   *
   * Listing PAGES rather than making one call — see `LIST_PAGE_SIZE`. The loop
   * deletes each page before requesting the next, so the offset never has to
   * advance: removing a page shifts the remainder down into offset 0. That also
   * makes the whole wipe restartable — a retry after a partial failure simply
   * resumes from whatever is left.
   */
  private async deleteAudioObjects(userId: string, userRef: string): Promise<void> {
    let removed = 0;

    for (let page = 0; ; page++) {
      if (page >= MAX_LIST_PAGES) {
        this.logger.error(`Storage wipe exceeded ${MAX_LIST_PAGES} pages for ${userRef}`);
        throw ApiException.internal('Account deletion failed');
      }

      const { data: files, error: listError } = await this.supabase.storage
        .from(AUDIO_BUCKET)
        .list(userId, { limit: LIST_PAGE_SIZE, offset: 0 });

      if (listError) {
        // The bucket does not exist until Phase 5 — that is not a deletion failure,
        // it just means there is no audio to remove yet.
        if (isBucketMissing(listError.message)) {
          this.logger.debug(`No audio bucket yet; skipping storage wipe for ${userRef}`);
          return;
        }
        this.logger.error(`Storage list failed for ${userRef}: ${listError.message}`);
        throw ApiException.internal('Account deletion failed');
      }

      if (!files || files.length === 0) break;

      const paths = files.map((file) => `${userId}/${file.name}`);
      await this.removeBatched(paths, userRef);
      removed += paths.length;

      // A short page is the last page — nothing is left behind it.
      if (files.length < LIST_PAGE_SIZE) break;
    }

    if (removed > 0) this.logger.log(`Removed ${removed} audio object(s) for ${userRef}`);
  }

  /** Removes paths in bounded batches; any failure aborts the deletion. */
  private async removeBatched(paths: string[], userRef: string): Promise<void> {
    for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
      const batch = paths.slice(i, i + REMOVE_BATCH_SIZE);
      const { error } = await this.supabase.storage.from(AUDIO_BUCKET).remove(batch);

      if (error) {
        this.logger.error(`Storage wipe failed for ${userRef}: ${error.message}`);
        throw ApiException.internal('Account deletion failed');
      }
    }
  }
}

function isBucketMissing(message: string): boolean {
  return /bucket not found/i.test(message);
}

function isUserNotFound(error: { status?: number | undefined; message: string }): boolean {
  return error.status === 404 || /user not found/i.test(error.message);
}
