import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Label, PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

import { priceLine } from './pricing';
import type { OfferedPlan } from './purchases';
import { TrialTimeline } from './TrialTimeline';

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
 * The post-Letter paywall (product 15 §spec; trial-timeline redesign 2026-08-10).
 *
 * It inherits the Letter's gradient so it reads as the next page of the letter
 * rather than an interruption. When the offer carries a free trial it leads with
 * the honest trial timeline — Today, a reminder, then the day billing could
 * start — a single trial-hero plan, one ember CTA, and the legal footer. When
 * there is no trial (the store has none configured yet) it degrades to a plain,
 * honest single-plan offer with a "Continue" CTA, never a timeline that promises
 * a trial that does not exist.
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
  const { colors, spacing, layout, radii } = useTheme();
  const scale = clampedFontScale();

  const [dismissable, setDismissable] = useState(false);

  useEffect(() => {
    analytics.capture('paywall_viewed', { surface: 'post_letter' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDismissable(true), DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // A single trial hero: prefer the plan that actually carries the trial (annual,
  // by store config), else the annual, else whatever is offered first.
  const hero = plans.find((p) => p.hasTrial) ?? plans.find((p) => p.id === 'annual') ?? plans[0];

  // Parent only mounts this when plans.length > 0, but stay defensive.
  if (!hero) return <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }} />;

  const showTrial = Boolean(hero.hasTrial && hero.trialDays);
  const t = paywallCopy.trial;

  const cadence =
    hero.id === 'annual'
      ? paywallCopy.plans.perYear
      : hero.id === 'monthly'
        ? paywallCopy.plans.perMonth
        : paywallCopy.plans.perWeek;
  const priceHead = `${hero.price}${hero.price.includes('/') ? '' : cadence}`;
  const equivalent = hero.monthlyEquivalent
    ? (hero.id === 'annual'
        ? paywallCopy.plans.annualEquivalent
        : paywallCopy.plans.weeklyEquivalent
      ).replace('{monthly}', hero.monthlyEquivalent)
    : null;
  const spoken = `${priceLine(hero.id, hero.price, hero.monthlyEquivalent)}${
    hero.hasTrial ? `. ${paywallCopy.plans.trialNote}` : ''
  }`;

  const heroCard = (
    <View accessible accessibilityLabel={spoken} testID="paywall-hero">
      <Card
        variant="solid"
        style={{
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: colors.accent.ember,
          backgroundColor: colors.surface.card,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="checkmark-circle" size={24} color={colors.accent.ember} />
          <View style={{ flex: 1, gap: spacing.xs / 2 }}>
            <Text
              allowFontScaling={false}
              style={[scaledType('listTitle', scale), { color: colors.text.primary }]}
            >
              {showTrial ? t.cardTitle : priceHead}
            </Text>
            {equivalent && (
              <Text
                allowFontScaling={false}
                style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
              >
                {equivalent}
              </Text>
            )}
          </View>
          <Text
            allowFontScaling={false}
            style={[scaledType('listTitle', scale), { color: colors.text.primary }]}
          >
            {priceHead}
          </Text>
        </View>
      </Card>
    </View>
  );

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
            <Text style={{ fontSize: 22 * scale, color: colors.text.disabled }}>✕</Text>
          </Pressable>
        )}

        <ScrollView
          contentContainerStyle={{
            paddingBottom: spacing.xl,
            paddingTop: dismissable && onDismiss ? 0 : spacing.xl,
            gap: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: spacing.xs }}>
            <Text
              allowFontScaling={false}
              style={[scaledType('title', scale), { color: colors.text.primary }]}
            >
              {showTrial ? t.headline : paywallCopy.headline}
            </Text>
            {showTrial && (
              <Text
                allowFontScaling={false}
                style={[scaledType('body', scale), { color: colors.text.secondary }]}
              >
                {t.subhead}
              </Text>
            )}
          </View>

          {showTrial && hero.trialDays && (
            <TrialTimeline trialDays={hero.trialDays} testID="paywall-timeline" />
          )}

          <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
            {showTrial && <Label>{t.badge}</Label>}
            {heroCard}
          </View>

          {showTrial ? (
            <Text
              allowFontScaling={false}
              style={[
                scaledType('bodySmall', scale),
                { color: colors.text.secondary, textAlign: 'center' },
              ]}
            >
              {t.noCommitment}
            </Text>
          ) : (
            <Text
              allowFontScaling={false}
              style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
            >
              {paywallCopy.plans.renewalNote}
            </Text>
          )}

          <PillButton
            title={showTrial ? paywallCopy.plans.ctaTrial : paywallCopy.plans.cta}
            tint={showTrial ? 'ember' : 'ink'}
            loading={busy}
            onPress={() => onPurchase(hero)}
            testID="paywall-continue"
          />

          {showTrial && (
            <Text
              allowFontScaling={false}
              style={[
                scaledType('bodySmall', scale),
                { color: colors.text.secondary, textAlign: 'center' },
              ]}
            >
              {t.renewal.replace('{days}', String(hero.trialDays)).replace('{price}', priceHead)}
            </Text>
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

          {/* The closing line — dismissal is a real outcome, said in the voice.
              Shown only in the dismissible (soft) presentation; the hard gate has
              no free exit for it to describe. */}
          {onDismiss && (
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
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
