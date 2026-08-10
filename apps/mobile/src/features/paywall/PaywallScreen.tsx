import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Label, PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

import { PlanCard } from './PlanCard';
import type { OfferedPlan } from './purchases';

/**
 * The dismiss control appears only after this delay (product 15 §spec).
 *
 * This is the one timing in the product that could be read as a dark pattern, so
 * it is worth being precise about why it is not: two seconds is roughly how long
 * the contrast block takes to read. Showing the X on frame one would mean the
 * offer is dismissed before it is seen; hiding it for longer would be coercion.
 * It is also the ONLY delay — no countdown, no timer, nothing that expires.
 */
export const DISMISS_DELAY_MS = 2_000;

export interface PaywallScreenProps {
  plans: OfferedPlan[];
  onPurchase: (plan: OfferedPlan) => void;
  /** Omit to render the wall with no dismiss — the hard-gate mode (2026-08-10). */
  onDismiss?: () => void;
  onRestore: () => void;
  /** An honest line under the CTA — e.g. this build cannot take a purchase. */
  notice?: string | null;
  /** Legal links (v4 §paywall footer). Rendered only when a handler exists. */
  onTerms?: () => void;
  onPrivacy?: () => void;
  busy?: boolean;
  testID?: string;
}

/**
 * The post-Letter paywall (product 15 §spec, v4 §paywall — "same world, honest
 * numbers").
 *
 * It inherits the Letter's gradient so it reads as the next page of the letter
 * rather than an interruption. Top to bottom: the quiet ✕, the serif headline,
 * the today/every-day contrast cards, the two honest plan cards, one renewal
 * disclosure, the single ink pill, the footer links, and the italic closing
 * line that makes dismissal a real outcome: the letter is hers either way.
 *
 * Everything product 01 §10 bans is absent by construction: no countdown, no
 * fake discount, no "quieter price" second offer, no social proof we have not
 * earned yet.
 */
export function PaywallScreen({
  plans,
  onPurchase,
  onDismiss,
  onRestore,
  notice = null,
  onTerms,
  onPrivacy,
  busy = false,
  testID,
}: PaywallScreenProps) {
  const { colors, spacing, layout, iconSizes } = useTheme();
  const scale = clampedFontScale();

  // Annual is pre-selected — the hero, and the honest best value (12 §1).
  const [selectedId, setSelectedId] = useState<string | null>(plans[0]?.id ?? null);
  const [dismissable, setDismissable] = useState(false);

  useEffect(() => {
    analytics.capture('paywall_viewed', { surface: 'post_letter' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDismissable(true), DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* The Letter's own gradient — same world, not a new one (product 15). */}
      <LinearGradient
        colors={[colors.bg.gradientMid, colors.bg.gradientBottom, colors.bg.base]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1, paddingHorizontal: layout.screenMargin }}>
        {dismissable && onDismiss && (
          <Pressable
            testID="paywall-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => {
              analytics.capture('paywall_dismissed');
              onDismiss();
            }}
            style={{ alignSelf: 'flex-end', padding: spacing.sm }}
          >
            {/* Disabled tint, deliberately — leaving must be possible, never loud. */}
            <Text style={{ fontSize: iconSizes.lg * scale, color: colors.text.disabled }}>✕</Text>
          </Pressable>
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            allowFontScaling={false}
            style={[
              scaledType('title', scale),
              {
                color: colors.text.primary,
                // Only collapse the top gap when the ✕ actually occupies it.
                marginTop: dismissable && onDismiss ? 0 : spacing.xl,
              },
            ]}
          >
            {paywallCopy.headline}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ContrastCard
              label={paywallCopy.contrast.todayLabel}
              body={paywallCopy.contrast.today}
            />
            <ContrastCard
              label={paywallCopy.contrast.everyDayLabel}
              body={paywallCopy.contrast.everyDay}
              parchment
            />
          </View>

          {/* The annual badge floats above its card, so the gap owes it headroom. */}
          <View style={{ gap: spacing.md, paddingTop: spacing.xs }}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={plan.id === selectedId}
                testID={`paywall-plan-${plan.id}`}
                onSelect={() => {
                  setSelectedId(plan.id);
                  analytics.capture('paywall_plan_selected', {
                    sku: plan.pkg?.product.identifier ?? plan.id,
                  });
                }}
              />
            ))}
          </View>

          <Text
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {paywallCopy.plans.renewalNote}
          </Text>

          {selected && (
            <PillButton
              title={selected.hasTrial ? paywallCopy.plans.ctaTrial : paywallCopy.plans.cta}
              loading={busy}
              onPress={() => onPurchase(selected)}
              testID="paywall-continue"
            />
          )}

          {notice && (
            <Text
              testID="paywall-notice"
              allowFontScaling={false}
              style={[
                scaledType('bodySmall', scale),
                { color: colors.text.secondary, textAlign: 'center' },
              ]}
            >
              {notice}
            </Text>
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <TextButton
              title={paywallCopy.footer.restore}
              onPress={onRestore}
              testID="paywall-restore"
            />
            {onTerms && (
              <TextButton
                title={paywallCopy.footer.terms}
                onPress={onTerms}
                testID="paywall-terms"
              />
            )}
            {onPrivacy && (
              <TextButton
                title={paywallCopy.footer.privacy}
                onPress={onPrivacy}
                testID="paywall-privacy"
              />
            )}
          </View>

          {/* The closing line — dismissal is a real outcome, said in the voice. */}
          <Text
            allowFontScaling={false}
            style={[
              scaledType('bodySmall', scale),
              {
                fontFamily: fonts.serifItalic,
                fontStyle: 'italic',
                color: colors.text.secondary,
                textAlign: 'center',
              },
            ]}
          >
            {paywallCopy.dismissed}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** One half of the today / every-day contrast row (v4 §paywall). */
function ContrastCard({
  label,
  body,
  parchment = false,
}: {
  label: string;
  body: string;
  parchment?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <Card
      variant="solid"
      style={[
        { padding: spacing.md, gap: spacing.xs },
        parchment
          ? // The continuing life sits on parchment and gets the wider column.
            { flex: 1.4, backgroundColor: colors.accent.parchment }
          : { flex: 1, borderWidth: 1, borderColor: colors.surface.border },
      ]}
    >
      <Label>{label}</Label>
      <Text
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: colors.text.body }]}
      >
        {body}
      </Text>
    </Card>
  );
}
