import { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
/** The active line parks a touch above centre, leaving room for the look-ahead below. */
const CENTER_FRACTION = 0.42;
/** How long the glide to the next line takes. */
const SCROLL_MS = 450;

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
 * Centering is a `translateY` on the content, NOT a ScrollView + `scrollTo`: a
 * programmatic scroll does not move a `scrollEnabled={false}` list on Android,
 * which is why the karaoke used to sit low. The transform runs on the UI thread;
 * the only JS transition is the active-line index changing every few seconds,
 * which re-splits the newly-active line into per-word nodes for the glow.
 */
export function SyncedLyrics({ lines, positionMs, testID }: SyncedLyricsProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const scale = clampedFontScale();

  const offsets = useSharedValue<number[]>([]);
  const svHeight = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [active, setActive] = useState(-1);

  // Glide the content so the spoken line rests near the centre; re-split it into
  // words (for the glow) only when the index actually changes.
  useAnimatedReaction(
    () => activeLineIndex(lines, positionMs.value),
    (index, previous) => {
      if (index < 0 || index === previous) return;
      const y = offsets.value[index] ?? 0;
      const target = -(y - svHeight.value * CENTER_FRACTION);
      translateY.value = motion.reduceMotion ? target : withTiming(target, { duration: SCROLL_MS });
      runOnJS(setActive)(index);
    },
    [lines, motion.reduceMotion],
  );

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

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
    <View
      testID={testID}
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) => {
        svHeight.value = e.nativeEvent.layout.height;
      }}
    >
      <Animated.View style={[containerStyle, { paddingHorizontal: spacing.lg }]}>
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
                    index === active
                      ? 1
                      : index < active
                        ? PAST_LINE_OPACITY
                        : UPCOMING_LINE_OPACITY,
                },
              ]}
            >
              {line.text}
            </Animated.Text>
          ),
        )}
      </Animated.View>
    </View>
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
