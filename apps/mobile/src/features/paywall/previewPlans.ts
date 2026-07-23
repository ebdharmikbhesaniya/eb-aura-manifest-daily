import { PRODUCT_IDS } from '@aura/shared';

import { monthlyEquivalent } from './pricing';
import type { OfferedPlan } from './purchases';

/**
 * Stand-in plans so the paywall can be OPENED during development.
 *
 * The paywall is unreachable without a RevenueCat offering, and an offering
 * needs `EXPO_PUBLIC_REVENUECAT_*` — so on a machine without those keys the
 * whole screen was undesignable: no way to look at it, no way to check a change
 * against v4. This exists purely so it can be opened and looked at.
 *
 * **`__DEV__` only, and it refuses to build otherwise.** These numbers are
 * invented. Real prices come from the store and never from a constant (12 §1):
 * a hardcoded figure next to a different number on the store's own sheet is the
 * misleading-price complaint that costs review stars. Nothing here may ever
 * reach a build a user sees, which is why `previewPlans` returns an empty list
 * outside development and the route refuses to purchase from one.
 */
const PREVIEW_ANNUAL_PRICE = 39.99;
const PREVIEW_WEEKLY_PRICE = 6.99;
const PREVIEW_CURRENCY = 'USD';

/** Enough of a package for analytics; a preview plan is never purchased. */
function fakePackage(productId: string): OfferedPlan['pkg'] {
  return { product: { identifier: productId } } as OfferedPlan['pkg'];
}

export function previewPlans(): OfferedPlan[] {
  if (!__DEV__) return [];

  return [
    {
      id: 'annual',
      pkg: fakePackage(PRODUCT_IDS.annual),
      price: `$${PREVIEW_ANNUAL_PRICE.toFixed(2)}`,
      monthlyEquivalent: monthlyEquivalent('annual', PREVIEW_ANNUAL_PRICE, PREVIEW_CURRENCY),
      hasTrial: false,
    },
    {
      id: 'weekly',
      pkg: fakePackage(PRODUCT_IDS.weekly),
      price: `$${PREVIEW_WEEKLY_PRICE.toFixed(2)}`,
      monthlyEquivalent: monthlyEquivalent('weekly', PREVIEW_WEEKLY_PRICE, PREVIEW_CURRENCY),
      hasTrial: true,
    },
  ];
}
