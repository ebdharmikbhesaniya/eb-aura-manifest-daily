import { z } from 'zod';

/**
 * RevenueCat webhook contract (07 §3, 12 §5).
 *
 * Deliberately TOLERANT: RevenueCat adds fields to these payloads over time, and
 * a strict schema would start rejecting live webhooks the day they ship one. So
 * unknown keys pass through, and everything we do not strictly need is optional.
 * The one thing we refuse to guess at is the event type.
 *
 * RC retries any non-200, so a payload we cannot parse must still be answered
 * 200 by the controller — see the endpoint for why silence beats a retry storm.
 */
export const RC_EVENT_TYPES = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
  'TRANSFER',
] as const;

export const rcEventTypeSchema = z.enum(RC_EVENT_TYPES);
export type RcEventType = z.infer<typeof rcEventTypeSchema>;

/** RC sends TRIAL / NORMAL / INTRO; INTRO is treated as a paid period. */
export const rcPeriodTypeSchema = z.enum(['TRIAL', 'NORMAL', 'INTRO', 'PROMOTIONAL']);

export const rcWebhookEventSchema = z
  .object({
    type: rcEventTypeSchema,
    id: z.string().optional(),
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    product_id: z.string().nullish(),
    /** PRODUCT_CHANGE names the product being moved TO. */
    new_product_id: z.string().nullish(),
    period_type: rcPeriodTypeSchema.nullish(),
    entitlement_ids: z.array(z.string()).nullish(),
    purchased_at_ms: z.number().nullish(),
    expiration_at_ms: z.number().nullish(),
    event_timestamp_ms: z.number().nullish(),
    environment: z.string().nullish(),
    /** TRANSFER carries the ids the entitlement moved between (03 §2.3). */
    transferred_from: z.array(z.string()).nullish(),
    transferred_to: z.array(z.string()).nullish(),
  })
  .passthrough();

export type RcWebhookEvent = z.infer<typeof rcWebhookEventSchema>;

export const rcWebhookBodySchema = z
  .object({
    api_version: z.string().optional(),
    event: rcWebhookEventSchema,
  })
  .passthrough();

export type RcWebhookBody = z.infer<typeof rcWebhookBodySchema>;

/** The entitlement RevenueCat grants for a paid subscription (12 §1). */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/** Store product ids (12 §1). Live prices are read from the store, never here. */
export const PRODUCT_IDS = {
  annual: 'aura_premium_annual',
  monthly: 'aura_premium_monthly',
  weekly: 'aura_premium_weekly',
} as const;

/** Display order on the cover: annual is the hero, then monthly, then weekly. */
export const PLAN_ORDER = ['annual', 'monthly', 'weekly'] as const;

export type PlanId = keyof typeof PRODUCT_IDS;

/**
 * Prices to SHOW when the store has none to give.
 *
 * 12 §1 says prices come from the store and never from a constant, and that
 * rule still holds for anything a purchase is made against: what the store
 * charges is the store's answer, not ours. But an unconfigured RevenueCat left
 * the paywall with nothing to render at all, which is worse than a figure that
 * may drift — a subscriber cannot evaluate an offer she cannot see.
 *
 * So these are DISPLAY-ONLY, and the app marks any plan built from them as
 * `purchasable: false` so it can never be charged against. The moment a real
 * offering resolves it wins outright.
 *
 * KEEP IN STEP WITH THE STORE. A figure here that disagrees with the one on
 * Apple's or Google's own sheet is the misleading-price complaint that costs
 * review stars — that is the risk this table is trading against.
 */
export const FALLBACK_PRICING: Record<
  PlanId,
  { amount: number; currency: string; hasTrial: boolean }
> = {
  annual: { amount: 39.99, currency: 'USD', hasTrial: false },
  monthly: { amount: 14.99, currency: 'USD', hasTrial: false },
  weekly: { amount: 6.99, currency: 'USD', hasTrial: true },
};
