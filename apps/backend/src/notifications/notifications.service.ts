import { Inject, Injectable, Logger } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { buildNotification, type NotificationKind, type TemplateInput } from './templates';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo rejects a batch larger than this, so sends are chunked. */
const EXPO_BATCH_SIZE = 100;

/**
 * Was this insert rejected because the row already existed?
 *
 * Only a unique violation means "already sent". Treating every error that way
 * — which is what a bare `if (claimError)` did — makes a database outage
 * indistinguishable from a successful de-duplication.
 */
function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key|already exists/i.test(error.message ?? '');
}

export interface SendRequest {
  userId: string;
  kind: NotificationKind;
  /** Idempotency within a kind — her local date, or a moment id (11 §6). */
  dedupeKey: string;
  input: TemplateInput;
  momentId?: string;
}

/**
 * Push delivery (11 §1).
 *
 * Every send originates HERE, never from the app: the content is not known
 * ahead of time and the arrival time is server-driven, so a client-scheduled
 * local notification could only ever be a guess (11 §1, "Exception: none").
 *
 * Three rules shape the method below:
 *   1. **Never notify about nothing.** A failed pre-generation produces no push
 *      (11 §7) — the template returns null and this returns early.
 *   2. **One per dedupe key.** The unique index on `notification_sends` makes a
 *      double delivery impossible rather than unlikely (11 §6).
 *   3. **Prefs are read at SEND time**, not schedule time (11 §4), so a
 *      preference changed after the cron queued something still wins.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly analytics: AnalyticsService,
  ) {}

  async send(request: SendRequest): Promise<{ sent: boolean; reason?: string }> {
    const content = buildNotification(request.kind, request.input);

    // No content, no notification (11 §7).
    if (!content) return { sent: false, reason: 'no_content' };

    // Tokens are read BEFORE the claim. The claim used to come first, so a user
    // with no registered device consumed her dedupe key and returned
    // `no_tokens`. For an arrival that is harmless — tomorrow has a new date key
    // — but `milestone`, `winback` and `trial_reminder` are keyed once per
    // lifetime, so someone who had not yet granted notification permission
    // never received them, even after granting it.
    const { data: tokens } = await this.supabase
      .from('notification_tokens')
      .select('expo_push_token')
      .eq('user_id', request.userId)
      .eq('active', true);

    if (!tokens?.length) return { sent: false, reason: 'no_tokens' };

    // Claim the send BEFORE delivering. A crash mid-send then costs one missed
    // note rather than a duplicate one — and a duplicate is the worse failure on
    // a surface that arrives uninvited.
    const { error: claimError } = await this.supabase.from('notification_sends').insert({
      user_id: request.userId,
      kind: request.kind,
      dedupe_key: request.dedupeKey,
      ...(request.momentId ? { moment_id: request.momentId } : {}),
    });

    if (claimError) {
      // A unique violation means it already went out; that is success, not
      // failure. Anything else is a real database problem, and reporting it as
      // `already_sent` would let an outage read as a quiet no-op — the send is
      // simply skipped and the next run retries it.
      if (isUniqueViolation(claimError)) return { sent: false, reason: 'already_sent' };

      this.logger.error(`Could not claim ${request.kind} send: ${claimError.message}`);
      return { sent: false, reason: 'claim_failed' };
    }

    // Multi-device: every active token gets it (11 §6).
    const messages = tokens.map((token) => ({
      to: token.expo_push_token,
      title: content.title,
      body: content.body,
      data: { ...content.data, url: content.url },
      sound: 'default',
      // Android delivery (11 §3): `high` tells FCM to wake the device now rather
      // than batching in Doze — an arrival note must land at her chosen time.
      priority: 'high' as const,
      // Must match ANDROID_NOTIFICATION_CHANNEL_ID in the app (useNotifications.ts):
      // the channel owns importance/sound, and a mismatched id drops to a silent one.
      channelId: 'default',
    }));

    try {
      // Chunked: Expo rejects an oversized batch outright, which would drop the
      // note for every device of a user who has accumulated a lot of them.
      // Receipts come back positionally, so each chunk is reconciled with the
      // slice of tokens that produced it.
      const allTokens = tokens.map((t) => t.expo_push_token);

      for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
        const batch = messages.slice(i, i + EXPO_BATCH_SIZE);

        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });

        const result = (await response.json()) as {
          data?: { status: string; details?: { error?: string } }[];
        };

        await this.retireDeadTokens(allTokens.slice(i, i + EXPO_BATCH_SIZE), result.data ?? []);
      }
    } catch (error) {
      this.logger.error(`Push send failed (${error instanceof Error ? error.name : 'unknown'})`);
      return { sent: false, reason: 'transport_error' };
    }

    if (request.kind === 'moment_arrival') {
      this.analytics.capture(request.userId, 'moment_arrival_notification_sent', {});
    }

    return { sent: true };
  }

  /**
   * `DeviceNotRegistered` means the app is gone from that device (11 §1).
   *
   * The row is deactivated rather than deleted so a reinstall on the same
   * device is recognised instead of quietly accumulating duplicate tokens.
   */
  private async retireDeadTokens(
    tokens: string[],
    receipts: { status: string; details?: { error?: string } }[],
  ): Promise<void> {
    const dead = tokens.filter(
      (_, index) =>
        receipts[index]?.status === 'error' &&
        receipts[index]?.details?.error === 'DeviceNotRegistered',
    );

    if (dead.length === 0) return;

    await this.supabase
      .from('notification_tokens')
      .update({ active: false })
      .in('expo_push_token', dead);

    this.logger.log(`Retired ${dead.length} unregistered device token(s)`);
  }

  /** Her notification preferences, with the documented defaults when unset. */
  async prefsFor(userId: string): Promise<{
    arrivalEnabled: boolean;
    ignoredArrivalCount: number;
    softened: boolean;
  }> {
    const { data } = await this.supabase
      .from('notification_prefs')
      .select('arrival_enabled, ignored_arrival_count, softened')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      arrivalEnabled: data?.arrival_enabled ?? true,
      ignoredArrivalCount: data?.ignored_arrival_count ?? 0,
      softened: data?.softened ?? false,
    };
  }
}
