import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Orb, Screen } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { analytics } from '@/lib/analytics';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { useConversation } from '../useConversation';

/** Design v5: a 124pt sphere; it breathes once and the contract follows. */
const SPLASH_ORB_SIZE = 124;
const SPLASH_HOLD_MS = 2400;

/**
 * 01 — splash. The orb breathes, the wordmark settles, and after one breath
 * the flow moves on by itself; a faint Continue lets her go sooner. This is
 * the first screen, so it starts the funnel clock (`onboarding_started`
 * fires once, guarded by `startedAt`).
 */
export function A01Splash() {
  const { colors, spacing } = useTheme();
  const { advance } = useConversation('a01-splash');
  const start = useOnboardingDraft((s) => s.start);
  const left = useRef(false);

  const go = () => {
    if (left.current) return;
    left.current = true;
    if (useOnboardingDraft.getState().startedAt === null) {
      analytics.capture('onboarding_started');
    }
    start();
    advance();
  };

  // Armed once on mount: re-arming on re-render would restart the hold.
  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const timer = setTimeout(() => goRef.current(), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen testID="a01-splash">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Orb state="idle" size={SPLASH_ORB_SIZE} />
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: fonts.serifSemiBold,
            fontSize: 46,
            lineHeight: 54,
            letterSpacing: 1,
            color: colors.text.primary,
            marginTop: spacing.xl + 2,
          }}
        >
          {onboardingCopy.a01Splash.brand}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            letterSpacing: 0.3,
            color: colors.text.secondary,
            marginTop: spacing.xs + 2,
          }}
        >
          {onboardingCopy.a01Splash.tagline}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={go}
        hitSlop={spacing.md}
        style={{ alignItems: 'center', paddingBottom: spacing.xl + spacing.lg }}
      >
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.text.disabled }}>
          {onboardingCopy.a01Splash.continue}
        </Text>
      </Pressable>
    </Screen>
  );
}
