import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen, TextButton } from '@/components';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { PaywallScreen } from '@/features/paywall/PaywallScreen';
import { appleAuthAvailable } from '@/features/paywall/claim';
import { markPaywallSeen } from '@/features/paywall/paywallSeen';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import {
  loadPlans,
  purchasePlan,
  restorePurchases,
  type OfferedPlan,
} from '@/features/paywall/purchases';
import { paywallCopy } from '@/copy/paywall';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';
import { LetterMotionProvider } from '@/theme/motion';

/**
 * `/paywall` — the first presentation, straight after the Letter (06 §1).
 *
 * Wrapped in `LetterMotionProvider` so it keeps the Letter's slower breath: the
 * paywall is meant to read as the next page of the letter, not as a different
 * app arriving to ask for money (product 15 §spec).
 *
 * Dismissal is a REAL outcome. It marks the paywall seen, sends her to the free
 * tier, and never re-presents this cover — a second, quieter offer is banned
 * (product 01 §10).
 */
export default function PaywallRoute() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  /**
   * How she got here. The first presentation arrives straight from the Letter
   * with no param; Settings sends `from=settings` because the two want opposite
   * behaviour when there is no offering — see the effect below.
   */
  const { from } = useLocalSearchParams<{ from?: string }>();
  const askedForPlans = from === 'settings';
  const [plans, setPlans] = useState<OfferedPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(true);
  const claimRef = useRef<BottomSheetModal>(null);

  // Distinct from `plans.length === 0`: before the lookup resolves the list is
  // empty too, and the two must not be confused — treating "still loading" as
  // "no offering" would skip the paywall for everyone.
  const [plansResolved, setPlansResolved] = useState(false);

  useEffect(() => {
    void loadPlans().then((offered) => {
      setPlans(offered);
      setPlansResolved(true);
    });
    void appleAuthAvailable().then(setAppleAvailable);
  }, []);

  const leaveToFreeTier = useCallback(() => {
    markPaywallSeen();
    // The notification ask is due on the first Home landing AFTER this (11 §2)
    // — never here. Product 08 forbids anything between the letter and the
    // paywall, and this is the first moment that rule stops applying.
    markPermissionAsked(false);
    router.replace('/(tabs)/home');
  }, [router]);

  /**
   * No offering — offline, or a build with no RevenueCat key.
   *
   * Straight after the Letter that means leaving quietly for the free tier: the
   * cover would render empty, and its dismiss ✕ lives inside `PaywallScreen`,
   * which the empty branch never mounts. She would be stranded.
   *
   * Reached from Settings it means the opposite. She tapped "See what's
   * included" ON PURPOSE, and replacing the route sent her back to Home with no
   * explanation — a tap that looked like it did nothing. That path gets an
   * honest line and a way back instead.
   */
  useEffect(() => {
    if (plansResolved && plans.length === 0 && !askedForPlans) leaveToFreeTier();
  }, [plansResolved, plans.length, askedForPlans, leaveToFreeTier]);

  const onPurchase = useCallback(async (plan: OfferedPlan) => {
    setBusy(true);
    const outcome = await purchasePlan(plan);
    setBusy(false);

    if (outcome.status !== 'purchased') {
      // A cancel is a legitimate answer, and a failure already surfaced through
      // Apple's own sheet. Neither gets an error state from us (product 14).
      return;
    }

    analytics.capture('purchase_completed', { sku: plan.pkg.product.identifier });
    markPaywallSeen();
    // Claim now, while the value is freshest — but entitlement is already hers
    // whether or not she completes it (03 §2.2).
    claimRef.current?.present();
  }, []);

  const onRestore = useCallback(async () => {
    setBusy(true);
    const { premium } = await restorePurchases();
    setBusy(false);

    if (premium) {
      markPaywallSeen();
      claimRef.current?.present();
    }
  }, []);

  return (
    <LetterMotionProvider>
      {plans.length > 0 ? (
        <View style={{ flex: 1 }}>
          <PaywallScreen
            testID="paywall"
            plans={plans}
            busy={busy}
            onPurchase={(plan) => void onPurchase(plan)}
            onDismiss={leaveToFreeTier}
            onRestore={() => void onRestore()}
          />
          <ClaimSheet
            ref={claimRef}
            afterPurchase
            appleAvailable={appleAvailable}
            onDone={() => {
              claimRef.current?.dismiss();
              router.replace('/(tabs)/home');
            }}
          />
        </View>
      ) : (
        // Holding view: either the offering lookup is still in flight, or it
        // came back empty and the effect above is on its way to the free tier.
        // Showing an empty paywall would be worse than not showing one — she
        // can subscribe from Settings later.
        <Screen testID="paywall-unavailable" edgeToEdge>
          {plansResolved && askedForPlans ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                gap: spacing.lg,
                // The cover is edge-to-edge; this copy still needs the margin.
                paddingHorizontal: spacing.xl,
              }}
            >
              <Text
                testID="paywall-unavailable-message"
                allowFontScaling={false}
                style={[
                  scaledType('body', scale),
                  { color: colors.text.secondary, textAlign: 'center' },
                ]}
              >
                {paywallCopy.subscription.plansUnavailable}
              </Text>
              <TextButton
                title={paywallCopy.subscription.back}
                onPress={() => router.back()}
                testID="paywall-unavailable-back"
              />
            </View>
          ) : (
            // Still in flight, or on its way to the free tier.
            <View style={{ flex: 1 }} />
          )}
        </Screen>
      )}
    </LetterMotionProvider>
  );
}
