import { Pressable, Text, View } from 'react-native';

import { Card, SerifDisplay } from '@/components';
import { streakCopy } from '@/copy/streak';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { StreakRing } from './StreakRing';
import type { StreakOutcome, StreakState } from './streak';

export interface StreakCardProps {
  state: StreakState;
  /** The week as `weekDots` returns it, oldest first. */
  week: boolean[];
  /** The most recent transition — decides the single line under the count. */
  lastOutcome: StreakOutcome['kind'] | null;
  onPress?: () => void;
  testID?: string;
}

/**
 * The count on Home (21 §4.2).
 *
 * Three rules this component exists to enforce, all of them anti-shame:
 *
 *  1. It renders NOTHING at 0/0. A zero on the first morning is discouragement,
 *     and 21 §10 has not settled whether it should appear before the first
 *     letter — so until that is answered it stays hidden rather than guessed.
 *  2. `longest` shows only once it exceeds the current run, which is precisely
 *     when it stops being a duplicate of the number above it and starts being
 *     evidence that the earlier days happened.
 *  3. A reset says her best run still happened. That line is the whole reason
 *     this design is allowed to have a loss state at all.
 */
export function StreakCard({ state, week, lastOutcome, onPress, testID }: StreakCardProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  // Nothing to show, and nothing worth saying about nothing.
  if (state.current === 0 && state.longest === 0) return null;

  const label = state.current === 1 ? streakCopy.labelOne : streakCopy.label;

  const note =
    lastOutcome === 'reset'
      ? streakCopy.reset.replace('{n}', String(state.longest))
      : lastOutcome === 'held'
        ? streakCopy.held
        : state.current === 1
          ? streakCopy.dayOne
          : state.longest > state.current
            ? streakCopy.longest.replace('{n}', String(state.longest))
            : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${state.current} ${label}`}
      testID={testID}
    >
      <Card variant="solid" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <StreakRing filled={week}>
          {/*
            `emberMark={false}` because the count is DATA, not a heading —
            SerifDisplay's own guidance. With the mark on, it splits the closing
            character into its own Text to colour it, which would break "12"
            into two nodes and put an ember tint on the 2.
          */}
          <SerifDisplay variant="title" emberMark={false}>
            {String(state.current)}
          </SerifDisplay>
        </StreakRing>

        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text
            allowFontScaling={false}
            style={[scaledType('body', scale), { color: colors.text.primary }]}
            testID={testID ? `${testID}-label` : undefined}
          >
            {label}
          </Text>
          {note !== null && (
            <Text
              allowFontScaling={false}
              style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
              testID={testID ? `${testID}-note` : undefined}
            >
              {note}
            </Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}
