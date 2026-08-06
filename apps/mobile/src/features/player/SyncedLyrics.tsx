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
  const { height: windowHeight } = useWindowDimensions();
  const scale = clampedFontScale();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offsets = useSharedValue<number[]>([]);
  // The lyrics area is shorter than the window (header + controls take the rest),
  // so centering must use THIS view's measured height, not the window's, or the
  // active line lands low with the look-ahead pushed off screen.
  const [viewHeight, setViewHeight] = useState(0);
  const svHeight = useSharedValue(0);
  const [active, setActive] = useState(-1);

  // Where the active line parks inside the lyrics area — a touch above centre, so
  // there is room for the upcoming lines below it.
  const CENTER_FRACTION = 0.42;

  // One reaction: recompute the spoken line on the UI thread, scroll it toward
  // centre, and (only on change) re-split it into words on the JS thread.
  useAnimatedReaction(
    () => activeLineIndex(lines, positionMs.value),
    (index, previous) => {
      if (index < 0 || index === previous) return;
      const y = offsets.value[index];
      const park = svHeight.value > 0 ? svHeight.value * CENTER_FRACTION : 0;
      if (y !== undefined) {
        scrollTo(scrollRef, 0, Math.max(0, y - park), !motion.reduceMotion);
      }
      runOnJS(setActive)(index);
    },
    [lines, motion.reduceMotion],
  );

  const padHeight = viewHeight > 0 ? viewHeight : windowHeight;

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
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && h !== viewHeight) {
          setViewHeight(h);
          svHeight.value = h;
        }
      }}
      contentContainerStyle={{
        // Half a screenful of padding at both ends so the first and last lines can
        // also reach the centre (spec §4).
        paddingTop: padHeight * CENTER_FRACTION,
        paddingBottom: padHeight * 0.5,
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
