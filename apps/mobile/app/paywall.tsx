import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Text, View } from 'react-native';

import { Screen, TextButton } from '@/components';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { goalKeyOf, primaryGoalOf } from '@/features/onboarding/flow';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { HandoffScreen } from '@/features/paywall/HandoffScreen';
import { PaywallScreen } from '@/features/paywall/PaywallScreen';
import { appleAuthAvailable } from '@/features/paywall/claim';
import { markPaywallSeen } from '@/features/paywall/paywallSeen';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import {
  loadPlans,
  purchasePlan,
  restorePurchases,
  type OfferedPlan,
} from '@/features/paywall/purchases';
import { paywallCopy } from '@/copy/paywall';
import { useProfile } from '@/hooks/useProfile';
import { analytics } from '@/lib/analytics';
import { env } from '@/lib/env';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';
import { LetterMotionProvider } from '@/theme/motion';

/**
 * `/paywall` — two presentations from one route.
 *
 * Wrapped in `LetterMotionProvider` so it keeps the Letter's slower breath: the
 * paywall is meant to read as the next page of the letter, not as a different
 * app arriving to ask for money (product 15 §spec).
 *
 * HARD mode (no `from` — reached from boot or the Letter) is the gate
 * (2026-08-10): no ✕, no free exit, Android back swallowed. The only ways past
 * it are a completed purchase, a successful restore, or the escape hatch when no
 * purchasable offering exists (so a keyless build / an offline reviewer is never
 * bricked). SOFT mode (`from=settings`) is the deliberate, dismissible offer she
 * opened herself; its ✕ pops back where she came from.
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
  // Hard mode is the gate: arrived from boot or the Letter, with no way out but a
  // completed purchase / restore (or the escape hatch when there is no offering).
  // Soft mode (from=settings) is the deliberate, dismissible presentation.
  const hard = !askedForPlans;
  const { premium } = useEntitlement();
  const userId = useAppState((s) => s.userId);
  const { data: profile } = useProfile(userId ?? undefined);
  const { todaysEntry } = useGratitude(userId ?? undefined);
  const answers = useOnboardingDraft((s) => s.answers);
  /**
   * Her primary goal keys the headline (design v5). The draft still holds her
   * answers after completion; the profile's first value is the fallback for a
   * device that never ran this onboarding.
   */
  const goal = answers['a04-goals']
    ? primaryGoalOf(answers)
    : (goalKeyOf(profile?.values?.[0]) ?? null);
  /**
   * The hand-off (design v5 step 26) — shown once the wall is behind her, paid
   * or free, before Home. `null` = still on the wall.
   */
  const [handoff, setHandoff] = useState(false);
  const [plans, setPlans] = useState<OfferedPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(true);
  const claimRef = useRef<BottomSheetModal>(null);

  // Distinct from `plans.length === 0`: before the lookup resolves the list is
  // empty too, and the two must not be confused — treating "still loading" as
  // "no offering" would skip the paywall for everyone.
  const [plansResolved, setPlansResolved] = useState(false);

  // A REAL offering means at least one plan is actually purchasable. The fallback
  // table is display-only (`pkg: null`, `purchasable: false`), so `plans` is never
  // empty even with no store behind it — which is why the hard gate keys off
  // "nothing purchasable", not "no plans". Showing display-only prices on the hard
  // wall would offer figures with nothing to charge and no way past the gate.
  const purchasable = plans.some((plan) => plan.purchasable);
  // The hard gate shows the cover ONLY for a real, purchasable offering; with none
  // it degrades to Home (the escape effect below). The soft, Settings-opened cover
  // may still show the indicative fallback prices with its honest "can't buy" note.
  const showCover = plans.length > 0 && (purchasable || !hard);

  useEffect(() => {
    void loadPlans().then((offered) => {
      setPlans(offered);
      setPlansResolved(true);
    });
    void appleAuthAvailable().then(setAppleAvailable);
  }, []);

  /**
   * The hard gate's escape hatch — the ONLY non-purchase way past it.
   *
   * Reached when there is no purchasable offering (offline, no RevenueCat key, or
   * an RC outage). The wall cannot be enforced, so she must not be stranded: mark
   * it seen (which the Home notification prompt still reads via `permissionGate`)
   * and let her in. A monetization outage degrades to Home, never a broken launch
   * (12 §2). It is also what the soft-mode ✕ used to fall through to.
   */
  const leaveToHome = useCallback(() => {
    markPaywallSeen();
    router.replace('/(tabs)/home');
  }, [router]);

  /**
   * Closing the cover.
   *
   * Opened deliberately — from Settings, or a locked-feature sheet — ✕ means
   * "take me back where I was", so it pops. It ran `leaveToFreeTier` before,
   * which did two wrong things at once on that path: replaced the route to Home
   * instead of returning her, and re-armed the notification ask, so the
   * permission sheet ambushed her on arrival. Neither is a dismissal; both
   * belong to the post-Letter presentation alone.
   */
  const onDismissCover = useCallback(() => {
    if (askedForPlans) {
      router.back();
      return;
    }
    // Design v5: the ✕ leads to the first-ritual hand-off, then Home. The free
    // tier is a real outcome, said once, never a punishment.
    setHandoff(true);
  }, [askedForPlans, router]);

  /**
   * A subscriber must never be held at the wall. Covers a premium user the boot
   * gate sent here before her snapshot resolved, and the restore path. RC is
   * configured by the time this route mounts, so `useEntitlement` is reliable
   * here — the boot race that forbids it in BootGate does not apply this late.
   */
  useEffect(() => {
    if (hard && premium) router.replace('/(tabs)/home');
  }, [hard, premium, router]);

  /**
   * No back out of the gate. The cover is already `gestureEnabled: false`; this
   * stops Android's hardware back from dropping her out mid-decision. A relaunch
   * would re-gate her anyway, so nothing is bypassed — this is just tidier.
   */
  useEffect(() => {
    if (!hard) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [hard]);

  /**
   * No PURCHASABLE offering — offline, no RevenueCat key, an RC outage, or the
   * store products not configured yet (App Store / Play). In every one of these
   * `loadPlans` still returns the display-only fallback table, so the tell is
   * "nothing purchasable", NOT "no plans" — the earlier `plans.length === 0` test
   * could never fire, which left the hard gate showing un-buyable fallback prices
   * with no exit.
   *
   * In HARD mode the wall cannot be enforced, so she must not be stranded: mark it
   * seen and let her through to Home. A monetization outage degrades to Home, never
   * a broken launch (12 §2).
   *
   * SOFT mode means the opposite: she tapped "See what's included" ON PURPOSE, so
   * replacing the route to Home would be a tap that looked like it did nothing.
   * That path keeps the indicative cover and its honest "can't purchase" note.
   */
  useEffect(() => {
    if (plansResolved && hard && !purchasable) leaveToHome();
  }, [plansResolved, hard, purchasable, leaveToHome]);

  const onPurchase = useCallback(
    async (plan: OfferedPlan) => {
      setNotice(null);
      setBusy(true);
      const outcome = await purchasePlan(plan);
      setBusy(false);

      if (outcome.status === 'unavailable') {
        // The figures came from the fallback table, so there is no package behind
        // them to charge. Say so rather than letting Continue look broken.
        setNotice(paywallCopy.purchaseUnavailableNote);
        return;
      }

      if (outcome.status !== 'purchased') {
        // A cancel is a legitimate answer, and a failure already surfaced through
        // Apple's own sheet. Neither gets an error state from us (product 14).
        return;
      }

      const sku = plan.pkg?.product.identifier ?? plan.id;
      analytics.capture('purchase_completed', { sku });
      // A trial start is its own funnel step — the number the paywall moves.
      // Fired client-side for immediate attribution; the RC webhook also emits it
      // server-side as the authority (12 §5).
      if (plan.hasTrial) analytics.capture('trial_started', { sku });
      markPaywallSeen();
      // Past the hard gate she is already through it — go straight Home rather than
      // flash the afterPurchase claim sheet (she is always claimed by now: the
      // sign-in gate is the first hop of the funnel). Soft mode keeps the sheet, so
      // a Settings purchase still offers to secure the account (03 §2.2).
      if (hard) {
        // Paid and free meet at the same hand-off (design v5 step 26).
        setHandoff(true);
        return;
      }
      claimRef.current?.present();
    },
    [hard],
  );

  const onRestore = useCallback(async () => {
    setBusy(true);
    const { premium } = await restorePurchases();
    setBusy(false);

    if (premium) {
      markPaywallSeen();
      if (hard) {
        router.replace('/(tabs)/home');
        return;
      }
      claimRef.current?.present();
    }
  }, [hard, router]);

  if (handoff) {
    return (
      <HandoffScreen
        testID="paywall-handoff"
        name={profile?.name?.trim() || null}
        gratitudeSaved={todaysEntry !== null}
        onStart={leaveToHome}
      />
    );
  }

  return (
    <LetterMotionProvider>
      {showCover ? (
        <View style={{ flex: 1 }}>
          <PaywallScreen
            testID="paywall"
            plans={plans}
            busy={busy}
            onPurchase={(plan) => void onPurchase(plan)}
            goal={goal}
            onDismiss={onDismissCover}
            onRestore={() => void onRestore()}
            notice={notice}
            // Rendered only when a URL exists. Both are required before a
            // subscription build passes store review; the footer omits a link
            // it cannot honour rather than showing a dead one.
            {...(env.EXPO_PUBLIC_TERMS_URL
              ? { onTerms: () => void Linking.openURL(env.EXPO_PUBLIC_TERMS_URL as string) }
              : {})}
            {...(env.EXPO_PUBLIC_PRIVACY_URL
              ? { onPrivacy: () => void Linking.openURL(env.EXPO_PUBLIC_PRIVACY_URL as string) }
              : {})}
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
        // Holding view: the offering lookup is still in flight, or (hard mode) it
        // resolved with nothing purchasable and the effect above is on its way to
        // Home. Showing an empty — or fake-priced — paywall would be worse than
        // showing none; she can subscribe from Settings once the store is live.
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
