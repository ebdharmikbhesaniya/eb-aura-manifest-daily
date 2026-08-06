import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Label, Orb } from '@/components';
import { playerCopy } from '@/copy/player';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { ReadMode } from './ReadMode';
import { SyncedLyrics } from './SyncedLyrics';
import { useSmoothPosition } from './useSmoothPosition';
import { TransportRow } from './TransportRow';
import { WaveBars } from './WaveBars';
import { formatTime, progressOf, usePlayerStore } from './playerStore';

/** The cover orb, when there is no karaoke to BE the cover (v4 §player). */
const ORB_SIZE = 170;
/** The cover's chrome glyphs (v4 §player): a 16pt chevron, a 17pt keep mark. */
const MINIMIZE_GLYPH = 16;
const KEEP_GLYPH = 17;

export interface PlayerScreenProps {
  onToggle: () => void;
  onBack15: () => void;
  onForward15: () => void;
  /** Scrub: absolute position in ms (from tapping/dragging the waveform). */
  onSeek: (positionMs: number) => void;
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
  onSeek,
  onFavorite,
  onRefine,
  onMinimize,
  canRefine = true,
  testID,
}: PlayerScreenProps) {
  const { colors, spacing, layout } = useTheme();
  const scale = clampedFontScale();

  const moment = usePlayerStore((s) => s.moment);
  const playing = usePlayerStore((s) => s.playing);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const speed = usePlayerStore((s) => s.speed);
  const mode = usePlayerStore((s) => s.mode);
  const cycleSpeed = usePlayerStore((s) => s.cycleSpeed);
  const toggleMode = usePlayerStore((s) => s.toggleMode);

  // The lyrics renderer reads position from a shared value driven at frame rate,
  // so the word glow sweeps smoothly between the audio's coarse status updates.
  const position = useSmoothPosition(positionMs, playing);

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
            paddingHorizontal: layout.coverMargin,
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
              <Text style={{ fontSize: MINIMIZE_GLYPH * scale, color: colors.text.secondary }}>
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
              {/* Blush in BOTH states, as on Home: only the fill changes, so an
                  unkept moment still reads as keepable (v4 §player). */}
              <Text style={{ fontSize: KEEP_GLYPH * scale, color: colors.accent.heart }}>
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
          // Synced lyrics ARE the cover (v4 §player). Distinct from the Letter's
          // reveal — see SyncedLyrics (spec 2026-08-06).
          <SyncedLyrics lines={moment.lines} positionMs={position} testID="player-karaoke" />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: layout.coverMargin,
            }}
          >
            <Orb state={playing ? 'speaking' : 'idle'} size={ORB_SIZE} testID="player-orb" />

            {!!moment.title && (
              <Text
                allowFontScaling={false}
                style={[
                  scaledType('coverTitle', scale),
                  { color: colors.text.primary, textAlign: 'center', marginTop: spacing.lg + 2 },
                ]}
              >
                {moment.title}
              </Text>
            )}

            <Text
              allowFontScaling={false}
              style={[
                scaledType('coverMeta', scale),
                { color: colors.text.label, textAlign: 'center', marginTop: spacing.xs + 2 },
              ]}
            >
              {playerCopy.fromLine.replace('{minutes}', String(minutes))}
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: layout.coverMargin, gap: spacing.md }}>
          <WaveBars
            progress={progressOf(positionMs, durationMs)}
            onSeek={durationMs > 0 ? (fraction) => onSeek(fraction * durationMs) : undefined}
            testID="player-progress"
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {/* Monospaced: a proportional face makes the elapsed time jitter
                as its digits change (v4 §player). */}
            <Text style={[scaledType('rowMeta', scale), { color: colors.text.label }]}>
              {formatTime(positionMs)}
            </Text>
            <Text style={[scaledType('rowMeta', scale), { color: colors.text.label }]}>
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
  const { colors, layout, spacing, radii } = useTheme();
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
        paddingVertical: spacing.sm + 1,
        paddingHorizontal: layout.listRowPaddingH,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        style={[scaledType('pillLabel', scale), { color: tint ?? colors.text.secondary }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
