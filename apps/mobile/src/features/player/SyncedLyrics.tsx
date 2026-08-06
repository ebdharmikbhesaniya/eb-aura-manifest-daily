import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { KaraokeLine, WordTiming } from '@/features/letter/karaoke';
import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, typography } from '@/theme/typography';

import { activeLineIndex, wordState } from './lyricsState';

/** Line opacities (spec §4). */
const PAST_LINE_OPACITY = 0.45;
const UPCOMING_LINE_OPACITY = 0.3;
/** A not-yet-spoken word inside the active line still half-shows so the line reads as filling in. */
const UPCOMING_WORD_OPACITY = 0.5;

export interface SyncedLyricsProps {
  lines: KaraokeLine[];
  positionMs: SharedValue<number>;
  testID?: string;
}

/**
 * The moment player's synced lyrics (spec 2026-08-06): all lines visible, the
 * active line centered and brightest, past dimmed, upcoming faint, with a soft
 * ember word-by-word glow sweeping the active line. Distinct from the Letter's
 * `KaraokeLetter` "materialize with the voice" reveal, which is untouched.
 *
 * Per-frame work is on the UI thread (worklets read `positionMs`); the only JS
 * transition is the active-line index changing every few seconds, which re-splits
 * the newly-active line into per-word nodes.
 */
export function SyncedLyrics({ lines, positionMs, testID }: SyncedLyricsProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const { height } = useWindowDimensions();
  const scale = clampedFontScale();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offsets = useSharedValue<number[]>([]);
  const [active, setActive] = useState(-1);

  // One reaction: recompute the spoken line on the UI thread, scroll it toward
  // centre, and (only on change) re-split it into words on the JS thread.
  useAnimatedReaction(
    () => activeLineIndex(lines, positionMs.value),
    (index, previous) => {
      if (index < 0 || index === previous) return;
      const y = offsets.value[index];
      if (y !== undefined) {
        // Park the spoken line a little above centre — reading sits naturally high.
        scrollTo(scrollRef, 0, Math.max(0, y - height * 0.4), !motion.reduceMotion);
      }
      runOnJS(setActive)(index);
    },
    [lines, height, motion.reduceMotion],
  );

  const lineTextStyle = {
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic' as const,
    fontSize: (typography.letterLine.fontSize ?? 22) * scale,
    lineHeight: (typography.letterLine.lineHeight ?? 38) * scale,
    color: colors.text.primary,
    marginBottom: spacing.md,
  };

  const onLayoutY = (index: number, y: number) => {
    const next = [...offsets.value];
    next[index] = y;
    offsets.value = next;
  };

  return (
    <Animated.ScrollView
      ref={scrollRef}
      testID={testID}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: height * 0.4,
        paddingBottom: height * 0.5,
        paddingHorizontal: spacing.lg,
      }}
    >
      {lines.map((line, index) =>
        index === active && !motion.reduceMotion ? (
          <ActiveLine
            key={line.index}
            line={line}
            positionMs={positionMs}
            textStyle={lineTextStyle}
            onLayoutY={(y) => onLayoutY(index, y)}
          />
        ) : (
          <Animated.Text
            key={line.index}
            accessibilityRole="text"
            allowFontScaling={false}
            onLayout={(e) => onLayoutY(index, e.nativeEvent.layout.y)}
            style={[
              lineTextStyle,
              {
                opacity:
                  index === active ? 1 : index < active ? PAST_LINE_OPACITY : UPCOMING_LINE_OPACITY,
              },
            ]}
          >
            {line.text}
          </Animated.Text>
        ),
      )}
    </Animated.ScrollView>
  );
}

interface ActiveLineProps {
  line: KaraokeLine;
  positionMs: SharedValue<number>;
  textStyle: object;
  onLayoutY: (y: number) => void;
}

/** The spoken line, rendered as words so the glow can sweep through it. */
function ActiveLine({ line, positionMs, textStyle, onLayoutY }: ActiveLineProps) {
  return (
    <Animated.Text
      accessibilityRole="text"
      allowFontScaling={false}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
      style={textStyle}
    >
      {line.words.map((word, i) => (
        <SyncedWord key={i} word={word} positionMs={positionMs} />
      ))}
    </Animated.Text>
  );
}

function SyncedWord({ word, positionMs }: { word: WordTiming; positionMs: SharedValue<number> }) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => {
    const state = wordState(word, positionMs.value);
    if (state === 'current') return { color: colors.accent.ember, opacity: 1 };
    if (state === 'upcoming') return { color: colors.text.primary, opacity: UPCOMING_WORD_OPACITY };
    return { color: colors.text.primary, opacity: 1 };
  });

  return <Animated.Text style={style}>{`${word.word} `}</Animated.Text>;
}

/** Exported for tests / reuse — the dim figures are product numbers (spec §4). */
export const SYNCED_PAST_OPACITY = PAST_LINE_OPACITY;
export const SYNCED_UPCOMING_OPACITY = UPCOMING_LINE_OPACITY;
