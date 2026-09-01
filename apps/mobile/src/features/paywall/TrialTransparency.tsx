import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

import type { OfferedPlan } from './purchases';

/** The ember spine's width (design 24). */
const SPINE_WIDTH = 34;

export interface TrialTransparencyProps {
  plan: OfferedPlan;
  /** The real trial length, from the store's intro offer. */
  trialDays: number;
  busy?: boolean;
  onStart: () => void;
  onBack: () => void;
  /** Injectable for tests; the dates are computed from it. */
  now?: Date;
  testID?: string;
}

/** "Sept 6" in her own locale. */
function shortDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function daysFrom(now: Date, days: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Trial transparency (design v5 step 24; ROSCA / Apple 3.1.2): the exact day
 * the reminder lands and the exact day and amount that could be charged,
 * written down before she taps. Every number here is a fact — the length from
 * the store's intro offer, the amount its real price, the dates her calendar.
 */
export function TrialTransparency({
  plan,
  trialDays,
  busy = false,
  onStart,
  onBack,
  now = new Date(),
  testID,
}: TrialTransparencyProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const scale = clampedFontScale();
  const c = paywallCopy.v5.transparency;

  const remindDay = Math.max(1, trialDays - 2);
  const rows = [
    { title: c.day1Title, body: c.day1, mark: 'dot' as const },
    {
      title: c.remindTitle
        .replace('{day}', String(remindDay))
        .replace('{date}', shortDate(daysFrom(now, remindDay - 1))),
      body: c.remind,
      mark: 'bell' as const,
    },
    {
      title: c.endTitle
        .replace('{day}', String(trialDays))
        .replace('{date}', shortDate(daysFrom(now, trialDays - 1))),
      body: c.end.replace('{price}', plan.price),
      mark: 'diamond' as const,
    },
  ];

  return (
    <View testID={testID} style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg + 2 }}>
        <Text
          allowFontScaling={false}
          style={[scaledType('display', scale), { color: colors.text.primary }]}
        >
          {c.title}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md + 6,
            padding: spacing.lg + 2,
            paddingLeft: spacing.md + 6,
            borderRadius: radii.sheet - 2,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            ...shadows.card,
          }}
        >
          <LinearGradient
            colors={[colors.accent.emberSoft, colors.accent.emberDeep]}
            style={{
              width: SPINE_WIDTH,
              borderRadius: SPINE_WIDTH / 2,
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingVertical: spacing.md + 4,
            }}
          >
            {rows.map((row) => (
              <View
                key={row.title}
                style={{
                  width: row.mark === 'dot' ? 17 : 12,
                  height: row.mark === 'dot' ? 17 : row.mark === 'bell' ? 11 : 12,
                  borderRadius: row.mark === 'dot' ? 9 : row.mark === 'bell' ? 3 : 2,
                  borderWidth: 1.4,
                  borderColor: 'rgba(255,255,255,0.85)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: row.mark === 'diamond' ? [{ rotate: '45deg' }] : [],
                }}
              >
                {row.mark === 'dot' && (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: colors.text.onCta,
                    }}
                  />
                )}
              </View>
            ))}
          </LinearGradient>

          <View style={{ flex: 1, justifyContent: 'space-between', gap: spacing.lg }}>
            {rows.map((row) => (
              <View key={row.title} style={{ gap: spacing.xs }}>
                <Text
                  allowFontScaling={false}
                  style={{
                    fontFamily: fonts.serifSemiBold,
                    fontSize: 19,
                    lineHeight: 23,
                    color: colors.text.primary,
                  }}
                >
                  {row.title}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
                >
                  {row.body}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
        <PillButton
          title={c.cta.replace('{days}', String(trialDays))}
          loading={busy}
          onPress={onStart}
          testID="paywall-start-trial"
        />
        <TextButton title={c.back} onPress={onBack} testID="paywall-transparency-back" />
      </View>
    </View>
  );
}
