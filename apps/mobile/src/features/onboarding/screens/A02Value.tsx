import { useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Orb, PillButton, Screen } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { fonts } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

const VALUE_ORB_SIZE = 132;

/**
 * A02 — the value carousel (merged from the Aura design). Three swipeable panels
 * introduce the ritual before any question. Continue proceeds regardless of the
 * panel in view — browsing is optional, the point is made on panel one.
 *
 * The marketing headline keeps the design's sans weight (Figtree, our Inter),
 * not the serif reserved for the emotional/identity voice.
 */
export function A02Value() {
  const { colors, spacing } = useTheme();
  const { advance } = useConversation('a02-value');
  const panels = onboardingCopy.a02Value.panels;
  const [page, setPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  return (
    <Screen testID="a02-value">
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Orb state="idle" size={VALUE_ORB_SIZE} />
        </View>

        <View onLayout={onLayout}>
          {pageWidth > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
            >
              {panels.map((panel) => (
                <View key={panel.title} style={{ width: pageWidth, paddingHorizontal: spacing.xs }}>
                  <Text
                    style={{
                      fontFamily: fonts.sansSemiBold,
                      fontSize: 30,
                      lineHeight: 36,
                      letterSpacing: -0.5,
                      color: colors.text.primary,
                      marginBottom: spacing.md,
                    }}
                  >
                    {panel.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 16,
                      lineHeight: 25,
                      color: colors.text.secondary,
                    }}
                  >
                    {panel.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xl }}>
          {panels.map((panel, i) => (
            <View
              key={panel.title}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 3,
                backgroundColor: i === page ? colors.cta.background : colors.surface.border,
              }}
            />
          ))}
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton title={onboardingCopy.a02Value.primary} onPress={advance} />
      </View>
    </Screen>
  );
}
