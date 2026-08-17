import { timingSafeEqual } from 'node:crypto';

import { rcWebhookBodySchema } from '@aura/shared';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../auth/public.decorator';
import type { Env } from '../config/env.schema';
import { SubscriptionsService } from './subscriptions.service';

/**
 * RevenueCat webhooks (07 §3, 12 §5).
 *
 * `@Public()` because RevenueCat has no Supabase JWT — it authenticates with the
 * shared secret configured in the RC dashboard, checked below. That check is the
 * only thing standing between the open internet and a row that says "premium",
 * so it is done before the body is even parsed.
 */
// RevenueCat retries every non-200, so a 429 here buys a retry storm against
// a legitimate sender. The shared secret is the gate on this route, not a rate
// limit — an attacker without it never reaches the body.
@SkipThrottle()
@Controller({ path: 'webhooks', version: '1' })
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('revenuecat')
  @HttpCode(HttpStatus.OK)
  async revenuecat(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ): Promise<{ received: true }> {
    this.assertAuthorized(authorization);

    const parsed = rcWebhookBodySchema.safeParse(body);

    if (!parsed.success) {
      // 200 on an unparseable body, deliberately. RevenueCat retries every
      // non-200, so returning an error here would buy an infinite retry loop
      // for a payload that will never parse — a new event type we do not handle
      // looks exactly like this. Log it and move on.
      this.logger.warn('Unrecognised RevenueCat webhook payload; acknowledged without applying');
      return { received: true };
    }

    await this.subscriptions.applyEvent(parsed.data.event);
    return { received: true };
  }

  /**
   * Constant-time comparison against the configured secret. An unset secret
   * REJECTS everything rather than allowing it: a misconfigured production
   * environment must fail closed, since the alternative is letting anyone grant
   * themselves premium.
   *
   * This used to be `authorization !== expected` under a comment claiming it was
   * "constant-time-ish", which it was not — `!==` on strings short-circuits at
   * the first differing byte. A remote timing attack on a webhook is
   * impractical, but a comment asserting a property the code lacks is the kind
   * of thing the next reader trusts instead of checking.
   */
  private assertAuthorized(authorization?: string): void {
    const expected = this.config.get('REVENUECAT_WEBHOOK_AUTH', { infer: true });

    if (!expected) {
      this.logger.error('REVENUECAT_WEBHOOK_AUTH is not configured — rejecting webhook');
      throw new UnauthorizedException();
    }

    if (!secureEquals(authorization, expected)) throw new UnauthorizedException();
  }
}

/**
 * Byte-for-byte equality in time independent of where the values diverge.
 *
 * `timingSafeEqual` throws on a length mismatch, so the lengths are compared
 * first. That does leak the length of the secret, which is not the thing worth
 * protecting — the bytes are.
 */
function secureEquals(actual: string | undefined, expected: string): boolean {
  if (actual === undefined) return false;

  const a = Buffer.from(actual, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
