import { FALLBACK_PRICING, PREMIUM_ENTITLEMENT_ID, PRODUCT_IDS, type PlanId } from '@aura/shared';
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
  if (!apiKey) return;

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
  /** Absent on a fallback plan — there is no store package behind one. */
  pkg: PurchasesPackage | null;
  /** Localized, straight from the store — never constructed by us. */
  price: string;
  /** Localized monthly equivalent, PRINTED not hidden (checklist #2). */
  monthlyEquivalent: string | null;
  hasTrial: boolean;
  /**
   * False when the figures came from `FALLBACK_PRICING` rather than the store.
   * The paywall renders these so she can read the offer, but nothing may be
   * charged against them — there is no package to charge.
   */
  purchasable: boolean;
}

/**
 * The offer as we can state it with no store behind us (12 §1 fallback).
 *
 * Display only. Sorted like the real thing so the cover looks the same either
 * way: annual is the hero and is pre-selected.
 */
export function fallbackPlans(): OfferedPlan[] {
  return (Object.keys(PRODUCT_IDS) as PlanId[])
    .map((id) => {
      const { amount, currency, hasTrial } = FALLBACK_PRICING[id];
      return {
        id,
        pkg: null,
        price: new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount),
        monthlyEquivalent: monthlyEquivalent(id, amount, currency),
        hasTrial,
        purchasable: false,
      };
    })
    .sort((a, b) => (a.id === 'annual' ? -1 : b.id === 'annual' ? 1 : 0));
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
  // No RevenueCat project in this build: state the offer from the fallback
  // table rather than rendering an empty cover.
  if (!configured) return fallbackPlans();

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return fallbackPlans();

  const plans: OfferedPlan[] = [];

  for (const [id, productId] of Object.entries(PRODUCT_IDS) as [PlanId, string][]) {
    const pkg = current.availablePackages.find((p) => p.product.identifier === productId);
    if (!pkg) continue;

    plans.push({
      id,
      pkg,
      price: pkg.product.priceString,
      monthlyEquivalent: monthlyEquivalent(id, pkg.product.price, pkg.product.currencyCode),
      hasTrial: Boolean(pkg.product.introPrice && pkg.product.introPrice.price === 0),
      purchasable: true,
    });
  }

  // An offering that named none of our products is no offering at all.
  if (plans.length === 0) return fallbackPlans();

  // Annual first: it is the hero and is pre-selected (12 §1).
  return plans.sort((a, b) => (a.id === 'annual' ? -1 : b.id === 'annual' ? 1 : 0));
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
  // A fallback plan carries figures, not a package. Nothing to charge.
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
