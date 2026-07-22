import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Label, Orb } from '@/components';
import { playerCopy } from '@/copy/player';
import { KaraokeLetter } from '@/features/letter/KaraokeLetter';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { ReadMode } from './ReadMode';
import { TransportRow } from './TransportRow';
import { WaveBars } from './WaveBars';
import { formatTime, progressOf, usePlayerStore } from './playerStore';

/** The cover orb, when there is no karaoke to BE the cover (v4 §player). */
const ORB_SIZE = 170;

export interface PlayerScreenProps {
  onToggle: () => void;
  onBack15: () => void;
  onForward15: () => void;
  onFavorite: () => void;
  onRefine: () => void;
  onMinimize: () => void;
  /** Refine is premium and one-per-moment; the screen just hides the entry. */
  canRefine?: boolean;
  testID?: string;
}

/**
 * The full player (product 09 §9.1, v4 §player — "full-screen cover, ember is
 * earned").
 *
 * Unlike the Letter — which has no controls at all, deliberately — this surface
 * is a normal player, because a daily moment is something she returns to rather
 * than a performance she is hearing once.
 *
 * Layout, top to bottom: header (minimize · label · heart), the cover (karaoke
 * when timings exist, otherwise the orb with the title under it), the waveform
 * with its two times, the transport, and a quiet row of option pills.
 */
export function PlayerScreen({
  onToggle,
  onBack15,
  onForward15,
  onFavorite,
  onRefine,
  onMinimize,
  canRefine = true,
  testID,
}: PlayerScreenProps) {
  const { colors, spacing, layout, iconSizes } = useTheme();
  const scale = clampedFontScale();

  const moment = usePlayerStore((s) => s.moment);
  const playing = usePlayerStore((s) => s.playing);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const speed = usePlayerStore((s) => s.speed);
  const mode = usePlayerStore((s) => s.mode);
  const cycleSpeed = usePlayerStore((s) => s.cycleSpeed);
  const toggleMode = usePlayerStore((s) => s.toggleMode);

  // The karaoke renderer reads position from a shared value; the store holds it
  // as plain state, so it is mirrored here rather than threaded through.
  const position = useSharedValue(0);
  useEffect(() => {
    position.value = positionMs;
  }, [positionMs, position]);

  if (!moment) return null;

  const minutes = Math.max(1, Math.round(durationMs / 60_000));

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <LinearGradient
        colors={[colors.bg.gradientTop, colors.bg.gradientMid, colors.bg.gradientBottom]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: layout.screenMargin,
          }}
        >
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playerCopy.minimize}
              onPress={onMinimize}
              hitSlop={12}
              testID="player-minimize"
            >
              <Text style={{ fontSize: iconSizes.md * scale, color: colors.text.secondary }}>
                ⌄
              </Text>
            </Pressable>
          </View>

          <Label>{playerCopy.coverLabel}</Label>

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={moment.favoritedAt ? playerCopy.unfavorite : playerCopy.favorite}
              onPress={onFavorite}
              hitSlop={12}
              testID="player-favorite"
            >
              <Text
                style={{
                  fontSize: iconSizes.lg * scale,
                  color: moment.favoritedAt ? colors.accent.heart : colors.text.secondary,
                }}
              >
                {moment.favoritedAt ? '♥' : '♡'}
              </Text>
            </Pressable>
          </View>
        </View>

        {mode === 'read' ? (
          <ReadMode
            lines={moment.lines}
            body={moment.body}
            positionMs={positionMs}
            testID="player-read"
          />
        ) : moment.lines.length > 0 ? (
          // When timings exist the karaoke IS the cover (v4 §player).
          <KaraokeLetter lines={moment.lines} positionMs={position} testID="player-karaoke" />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: layout.screenMargin,
            }}
          >
            <Orb state={playing ? 'speaking' : 'idle'} size={ORB_SIZE} testID="player-orb" />

            {!!moment.title && (
              <Text
                allowFontScaling={false}
                style={[
                  scaledType('letterLine', scale),
                  { color: colors.text.primary, textAlign: 'center', marginTop: spacing.lg },
                ]}
              >
                {moment.title}
              </Text>
            )}

            <Text
              allowFontScaling={false}
              style={[
                scaledType('bodySmall', scale),
                { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs },
              ]}
            >
              {playerCopy.fromLine.replace('{minutes}', String(minutes))}
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: layout.screenMargin, gap: spacing.md }}>
          <WaveBars progress={progressOf(positionMs, durationMs)} testID="player-progress" />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}>
              {formatTime(positionMs)}
            </Text>
            <Text style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}>
              {formatTime(durationMs)}
            </Text>
          </View>

          <TransportRow
            playing={playing}
            onToggle={onToggle}
            onBack15={onBack15}
            onForward15={onForward15}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.lg,
              paddingBottom: spacing.lg,
              paddingTop: spacing.xs,
            }}
          >
            <ControlPill title={`${speed}×`} onPress={() => cycleSpeed()} testID="player-speed" />

            <ControlPill
              title={mode === 'listen' ? playerCopy.readMode : playerCopy.listenMode}
              onPress={() => {
                toggleMode();
                analytics.capture('moment_read_mode_toggled');
              }}
              testID="player-mode-toggle"
            />

            {canRefine && (
              <ControlPill
                title={playerCopy.refine}
                tint={colors.cta.link}
                onPress={onRefine}
                testID="player-refine"
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** The quiet option pills under the transport — white, bordered, lowercase energy. */
function ControlPill({
  title,
  onPress,
  tint,
  testID,
}: {
  title: string;
  onPress: () => void;
  /** Overrides the resting text colour — the Refine entry uses the link tint. */
  tint?: string;
  testID: string;
}) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => ({
        backgroundColor: colors.surface.card,
        borderWidth: 1,
        borderColor: colors.surface.border,
        borderRadius: radii.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: tint ?? colors.text.secondary }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
