import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

export interface EyebrowProps {
  children: string;
  /** Ember (default) for the "because you chose…" lines; muted for quiet framing. */
  tone?: 'ember' | 'muted';
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

/** The v5 eyebrow — a small uppercase line above a serif question or beat. */
export function Eyebrow({ children, tone = 'ember', center = false, style }: EyebrowProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        {
          fontFamily: fonts.sans,
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: tone === 'ember' ? colors.accent.emberDeep : colors.text.label,
          textAlign: center ? 'center' : 'left',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
