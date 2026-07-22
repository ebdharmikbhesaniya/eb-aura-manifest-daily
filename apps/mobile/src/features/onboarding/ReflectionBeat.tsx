import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/theme/haptics';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { ChatBubble, type ChatBubbleTone } from './ChatBubble';
import { TypingDots } from './TypingDots';

/** Product 13 §catalog: typing dots 600ms before the reply lands. */
const TYPING_MS = 600;

/** The small orb-gradient disc that speaks the reflection (v4: ~34pt). */
const DISC_SIZE = 34;

/** The reflection speaks in the voice serif ('letterLine'), a step smaller (v4: ~15pt). */
const REFLECTION_TYPE_SCALE = 0.68;

/**
 * The reflection beat (product 07): after a meaningful answer, Aura visibly
 * "types", then replies with one warm echo. The pause is the point — it proves
 * someone is listening before replying. A reflection that appears instantly
 * reads as a template, which is the one thing it must never read as.
 *
 * V4 dress: a small orb disc beside a parchment speech bubble, the line in
 * italic serif — the voice, not the interface. The vulnerable beat (S10) sits
 * on blush instead.
 *
 * Under Reduce Motion the dots are skipped (they are pure motion), but the
 * pause itself is kept: the timing carries the meaning, not the pixels.
 */
export function ReflectionBeat({
  line,
  onDone,
  holdMs = 0,
  tone = 'parchment',
}: {
  line: string;
  /** Fires after the line has landed AND been held long enough to read. */
  onDone?: () => void;
  /** Dwell after landing. Owned here so the timer dies with the component. */
  holdMs?: number;
  /** 'blush' for the vulnerable beat (S10); 'parchment' everywhere else. */
  tone?: Exclude<ChatBubbleTone, 'card'>;
}) {
  const { colors, radii, spacing } = useTheme();
  const { reduceMotion } = useMotion();
  const [landed, setLanded] = useState(false);

  // Every caller passes an inline arrow, so `onDone` is a new function on each
  // of the parent's renders. Holding it in a ref keeps it out of the effect's
  // deps: otherwise the effect re-runs on every parent render, restarting the
  // beat — which re-fires the haptic and calls `onDone` again, and since
  // `onDone` navigates, that render-loops the screen (it stuck on S4→S5 with
  // the haptic budget warning climbing forever).
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // The beat is one-shot per mount: type, land, hold, done. `line` and `holdMs`
  // are fixed for a given reflection, so there is nothing here to re-run for.
  useEffect(() => {
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const typingTimer = setTimeout(() => {
      setLanded(true);
      // Soft tick as the reflection lands (product 13 haptic table).
      void haptic('reflectionLanded');
      holdTimer = setTimeout(() => onDoneRef.current?.(), holdMs);
    }, TYPING_MS);

    // Both timers die with the component — a screen-level setTimeout would
    // outlive navigation and fire into an unmounted world.
    return () => {
      clearTimeout(typingTimer);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [holdMs]);

  const disc = (
    <LinearGradient
      // The orb's own gradient at speech-bubble scale — Aura is the speaker.
      colors={[colors.orb.core, colors.orb.halo]}
      start={{ x: 0.3, y: 0.2 }}
      end={{ x: 0.9, y: 1 }}
      style={{ width: DISC_SIZE, height: DISC_SIZE, borderRadius: radii.pill }}
    />
  );

  if (!landed) {
    return reduceMotion ? (
      <View style={{ minHeight: spacing.xl }} />
    ) : (
      <View
        accessibilityElementsHidden
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
      >
        {disc}
        <ChatBubble tone={tone}>
          <TypingDots testID="typing-dots" />
        </ChatBubble>
      </View>
    );
  }

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(0) : FadeIn.duration(300)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
    >
      {disc}
      <View style={{ flexShrink: 1 }}>
        <ChatBubble tone={tone}>
          <Text
            accessibilityLiveRegion="polite"
            allowFontScaling={false}
            style={[
              scaledType('letterLine', clampedFontScale() * REFLECTION_TYPE_SCALE),
              { color: colors.text.body },
            ]}
          >
            {line}
          </Text>
        </ChatBubble>
      </View>
    </Animated.View>
  );
}
