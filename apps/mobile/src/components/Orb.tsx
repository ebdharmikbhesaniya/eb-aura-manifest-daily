import { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

import orbHero from '../../assets/brand/orb-hero.png';

/**
 * The Orb — Aura's body, and the app's only performer (product 12 §signature,
 * 05 §5). It appears in onboarding, the generation ritual, and the player.
 * Never bounces, never cartoons: every state is a variation of breathing.
 *
 * The sphere itself is the brand orb-hero art (a warm, self-glowing orb on
 * transparent). All motion is a single scale transform on a Reanimated shared
 * value, so nothing here touches the JS thread per frame (05 §5: UI thread only
 * — the 60fps budget is release-blocking, product 13).
 *
 * States (05 §5):
 *   idle       4s breath, scale 1.0↔1.04
 *   listening  gentle breath
 *   generating 3s breath — anticipation, not urgency
 *   speaking   breath + a subtle push from the voice amplitude
 *
 * Reduce Motion: breath amplitude → 0 (a still, softly glowing sphere).
 */
export type OrbState = 'idle' | 'listening' | 'generating' | 'speaking';

export interface OrbProps {
  state: OrbState;
  /** Sphere diameter in pt. The image adds a little room for the halo. */
  size?: number;
  /**
   * 0..1 loudness from PlayerService's metering callback (10 §5). Only read in
   * the `speaking` state. A shared value, so audio drives the glow without a
   * single React render.
   */
  amplitude?: SharedValue<number>;
  testID?: string;
}

/** Breath cycle lengths (product 13 catalog): idle 4s; generating "slightly faster" 3s. */
const BREATH_MS: Record<OrbState, number> = {
  idle: 4000,
  listening: 4000,
  generating: 3000,
  speaking: 4000,
};

const BREATH_SCALE_MAX = 1.04;

/**
 * The orb-hero art carries its own halo out to the image edge, so the sphere is
 * ~0.9 of the frame. Rendering a touch larger than `size` lets that glow read
 * without the sphere itself shrinking below the requested diameter.
 */
const ART_SCALE = 1.16;

export function Orb({ state, size = 160, amplitude, testID }: OrbProps) {
  const { durations } = useTheme();
  const { reduceMotion } = useMotion();

  // 0..1 breath phase driving the scale.
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      // Still, softly lit — withTiming (not a snap) so turning the setting on
      // mid-animation eases out instead of jumping.
      breath.value = withTiming(0.5, { duration: durations.reveal });
      return;
    }

    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS[state] / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    return () => {
      // A repeating animation outlives unmount unless cancelled — a leaked
      // infinite loop is exactly the kind of quiet CPU cost 05 §5 caps.
      cancelAnimation(breath);
    };
  }, [state, reduceMotion, breath, durations.reveal]);

  const artSize = size * ART_SCALE;

  const animatedStyle = useAnimatedStyle(() => {
    const speakingBoost = amplitude ? amplitude.value * 0.06 : 0;
    const scale = 1 + breath.value * (BREATH_SCALE_MAX - 1) + speakingBoost;
    return { transform: [{ scale }] };
  }, [amplitude]);

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      // The orb is presence, not information — VoiceOver users get the screen's
      // in-voice copy instead of a mysterious unlabeled image.
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={animatedStyle}>
        <Image source={orbHero} style={{ width: artSize, height: artSize }} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}
