import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Skeleton } from './Skeleton';

export interface SkeletonListProps {
  /** How many placeholder rows to draw — roughly what the real list will show. */
  rows?: number;
  /** Row height. Defaults to a list-row height; pass taller for serif cards. */
  rowHeight?: number;
  testID?: string;
}

/**
 * A column of shimmer rows for a loading LIST (product 12 §loading).
 *
 * This is the ONLY place loading is a skeleton — everywhere else it is the orb
 * plus one line of copy (see Skeleton). It exists so list screens stop flashing
 * their EMPTY state (or a blank view) during the first fetch: an undefined query
 * result and a genuinely empty one look identical to a screen, so without this a
 * user briefly reads "nothing kept yet" before her kept words appear.
 */
export function SkeletonList({ rows = 4, rowHeight = 52, testID }: SkeletonListProps) {
  const { spacing, radii } = useTheme();

  return (
    <View
      testID={testID}
      // The whole placeholder block is invisible to assistive tech — it carries
      // no information and should not be read before the real rows arrive.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ gap: spacing.sm }}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={rowHeight} style={{ borderRadius: radii.field }} />
      ))}
    </View>
  );
}
