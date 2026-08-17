import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ApiException } from './api.exception';

/**
 * Throttling keyed on the USER, falling back to the client IP.
 *
 * The stock guard tracks by IP alone, which is the wrong key for this backend
 * twice over. Behind Render's proxy every request arrives from a small set of
 * edge addresses, so an IP bucket is shared by unrelated people — one user
 * hammering `/v1/generation/manifest` would throttle strangers. And the cost
 * being protected is per-account anyway: the credit ledger, the LLM spend and
 * the TTS spend all belong to a user id, not an address.
 *
 * The IP fallback still matters: `@Public()` routes have no user, and the auth
 * guard may not have run yet depending on global-guard ordering. An
 * unauthenticated caller is therefore limited by address, which is the only key
 * available for one.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const userId = req.userId;
    if (typeof userId === 'string' && userId !== '') return `user:${userId}`;

    // `ips` is populated when Express trusts the proxy (see main.ts); the first
    // entry is the real client. `ip` covers the direct-connection case.
    const ips = req.ips;
    const forwarded = Array.isArray(ips) && ips.length > 0 ? (ips[0] as string) : undefined;

    return `ip:${forwarded ?? (req.ip as string | undefined) ?? 'unknown'}`;
  }

  /**
   * Answers in the app's own error envelope (07 §5) rather than Nest's default
   * `ThrottlerException` body, so mobile's `ApiRequestError` can carry a stable
   * key like every other 4xx and map it to in-voice copy.
   */
  protected override async throwThrottlingException(): Promise<void> {
    throw new ApiException('rate_limited', 'Too many requests');
  }
}
