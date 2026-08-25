import { PLAN_ORDER, PREMIUM_ENTITLEMENT_ID, PRODUCT_IDS, type PlanId } from '@aura/shared';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { env } from '@/lib/env';

import { monthlyEquivalent } from './pricing';

/**
 * RevenueCat wiring (12 §2, 03 §4).
 *
 * The single most important line in this file is `logIn(supabaseUserId)`: RC's
 * `app_user_id` IS the Supabase user id, for anonymous AND claimed users alike.
 * Because claiming an account does not change that id, there is no RC aliasing
 * to reconcile and a purchase made anonymously survives the claim untouched —
 * which is what makes "purchase never loses her data" true rather than aspirational.
 */

let configured = false;

/**
 * Configures the SDK once and binds it to her Supabase identity.
 *
 * A missing key is not fatal: the app must still run on a dev build with no
 * RevenueCat project, and every entitlement read simply resolves to free. That
 * is why `isConfigured` exists rather than a throw — a monetization outage must
 * degrade to "free tier", never to a broken launch.
 */
export async function configurePurchases(userId: string): Promise<void> {
  // RevenueCat issues a per-store key; the iOS one is rejected by the Android
  // SDK, so this must be selected by platform rather than shared.
  const apiKey = Platform.select({
    ios: env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey) {
    // Silent until now, and that silence cost real debugging time: with no key
    // the SDK never configures, `isConfigured()` stays false, and the boot gate
    // routes straight past the paywall to Home. The subscription screen simply
    // never appears, and nothing anywhere says why.
    if (__DEV__) {
      console.warn(
        '[purchases] No RevenueCat key for this platform — set ' +
          'EXPO_PUBLIC_REVENUECAT_IOS_KEY (or _ANDROID_KEY) and REBUILD. ' +
          'EXPO_PUBLIC_* vars are inlined at build time, so a Metro reload is ' +
          'not enough. Until then the paywall is unenforceable and boot goes ' +
          'to Home (see routeGate).',
      );
    }
    return;
  }

  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
    return;
  }

  // Already configured this session — a re-login (rare: only after a claim on a
  // second identity) re-points the SDK without reconfiguring it.
  await Purchases.logIn(userId);
}

export function isConfigured(): boolean {
  return configured;
}

/** True when RevenueCat reports the `premium` entitlement as active. */
export function hasPremium(info: CustomerInfo | null | undefined): boolean {
  return Boolean(info?.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

/** Whether she is inside a free trial, for the honest Settings label (12 §6). */
export function isInTrial(info: CustomerInfo | null | undefined): boolean {
  const entitlement = info?.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  return entitlement?.periodType === 'TRIAL';
}

export interface OfferedPlan {
  id: PlanId;
  /** The store package this plan is bought against. Never null for a real plan. */
  pkg: PurchasesPackage | null;
  /** Localized, straight from the store — never constructed by us. */
  price: string;
  /** Localized monthly equivalent, PRINTED not hidden (checklist #2). */
  monthlyEquivalent: string | null;
  hasTrial: boolean;
  /**
   * The trial length in days, read from the store's intro offer — drives the
   * trial timeline ("Today / In {n-2} days / In {n} days"). Null when there is
   * no trial; the timeline is never shown without it, so it can never promise a
   * trial that does not exist.
   */
  trialDays: number | null;
  /**
   * True for a real store package. Kept as an explicit guard so a plan with no
   * package can never be treated as buyable — the paywall shows the cover only
   * for a purchasable offering and otherwise degrades to Home (see the route).
   */
  purchasable: boolean;
}

/**
 * Trial length in whole days from a store intro offer, or null when the offer is
 * not a free trial. RevenueCat reports the period in its own unit (DAY/WEEK/…),
 * so normalise to days for the timeline.
 */
export function trialDaysFromIntro(
  intro: PurchasesPackage['product']['introPrice'] | null | undefined,
): number | null {
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case 'DAY':
      return n;
    case 'WEEK':
      return n * 7;
    case 'MONTH':
      return n * 30;
    case 'YEAR':
      return n * 365;
    default:
      return null;
  }
}

/** Cover order (12 §1): annual hero first, then monthly, then weekly. */
function byPlanOrder(a: OfferedPlan, b: OfferedPlan): number {
  return PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id);
}

/**
 * Loads the current offering as plan cards.
 *
 * Prices come from the store, never from a constant: they are localized, they
 * change, and a stale hardcoded figure next to a different number on Apple's
 * sheet is precisely the "misleading price" complaint that costs review stars
 * (product 15 §user sentiment).
 */
export async function loadPlans(): Promise<OfferedPlan[]> {
  // No RevenueCat project in this build: return no plans rather than inventing
  // prices. The hard gate then degrades to Home; the Settings cover says the
  // plans are unavailable. Prices come from the store or not at all (12 §1).
  if (!configured) {
    if (__DEV__) {
      console.warn(
        '[purchases] loadPlans: SDK not configured — returning NO plans. Set the ' +
          'RevenueCat key and REBUILD. See the configure warning above.',
      );
    }
    return [];
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) {
    if (__DEV__) {
      console.warn(
        '[purchases] loadPlans: RevenueCat has no CURRENT offering — returning NO ' +
          'plans. Create an Offering in the RevenueCat dashboard, mark it current, ' +
          'and add a package per product.',
      );
    }
    return [];
  }

  const plans: OfferedPlan[] = [];

  for (const [id, productId] of Object.entries(PRODUCT_IDS) as [PlanId, string][]) {
    // Google Play reports a subscription's product as `<productId>:<basePlanId>`
    // (e.g. `aura_premium_annual:annual`); Apple reports the bare `productId`.
    // Match both so the offering resolves on either store (without this, Android
    // never matched and every plan silently resolved to nothing).
    const pkg = current.availablePackages.find(
      (p) => p.product.identifier === productId || p.product.identifier.startsWith(`${productId}:`),
    );
    if (!pkg) continue;

    const trialDays = trialDaysFromIntro(pkg.product.introPrice);
    plans.push({
      id,
      pkg,
      price: pkg.product.priceString,
      monthlyEquivalent: monthlyEquivalent(id, pkg.product.price, pkg.product.currencyCode),
      hasTrial: trialDays !== null,
      trialDays,
      purchasable: true,
    });
  }

  // An offering that named none of our products is no offering at all.
  if (plans.length === 0) {
    if (__DEV__) {
      console.warn(
        '[purchases] loadPlans: the current offering contains none of our ' +
          `product ids. Expected one of ${Object.values(PRODUCT_IDS).join(', ')}; ` +
          `the offering has ${
            current.availablePackages.map((p) => p.product.identifier).join(', ') || '(no packages)'
          }. Ids must match character for character.`,
      );
    }
    return [];
  }

  // Annual first: it is the hero and is pre-selected (12 §1).
  return plans.sort(byPlanOrder);
}

export type PurchaseOutcome =
  | { status: 'purchased'; premium: boolean }
  | { status: 'cancelled' }
  | { status: 'failed' }
  /** No store package behind the plan — the build has no RevenueCat offering. */
  | { status: 'unavailable' };

/**
 * Runs a purchase through Apple's sheet.
 *
 * A cancellation is NOT an error and must never be surfaced as one: she looked
 * at the price and said no, which is a legitimate answer this product respects
 * (product 15). It returns its own status so the caller cannot accidentally
 * render an error state for it.
 */
export async function purchasePlan(plan: OfferedPlan): Promise<PurchaseOutcome> {
  // Defensive: a plan with no store package cannot be charged. Real plans always
  // carry one, so this should never fire — it just refuses rather than throwing.
  if (!plan.pkg) return { status: 'unavailable' };

  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return { status: 'purchased', premium: hasPremium(customerInfo) };
  } catch (error) {
    if ((error as { userCancelled?: boolean })?.userCancelled) return { status: 'cancelled' };
    return { status: 'failed' };
  }
}

/**
 * Restores a previous purchase (12 §2). Available on the paywall footer and in
 * Settings — someone who already paid must never be asked to pay twice because
 * they changed phones.
 */
export async function restorePurchases(): Promise<{ premium: boolean }> {
  if (!configured) return { premium: false };

  try {
    return { premium: hasPremium(await Purchases.restorePurchases()) };
  } catch {
    return { premium: false };
  }
}

/** Opens the App Store's own manage-subscription sheet — cancel in 2 taps (checklist #5). */
export async function openManageSubscriptions(): Promise<void> {
  if (!configured) return;
  await Purchases.showManageSubscriptions();
}
