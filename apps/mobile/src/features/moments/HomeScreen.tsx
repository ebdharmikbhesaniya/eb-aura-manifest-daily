import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Card,
  Label,
  Orb,
  PillButton,
  RowGroup,
  SerifDisplay,
  TextButton,
  useTabBarClearance,
} from '@/components';
import { momentsCopy } from '@/copy/moments';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { localDay } from '@/features/streak/day';
import { StreakCard } from '@/features/streak/StreakCard';
import { monthFrom, type StreakOutcome, type StreakState } from '@/features/streak/streak';

import { greetingFor, type HomeMomentState } from './momentState';
import { TodayMomentCard } from './TodayMomentCard';

/** Small header orb — presence, not the performer (v4 §home). */
const HEADER_ORB_SIZE = 56;

export type CollectionId = 'favorites' | 'ondemand';

export interface HomeScreenProps {
  name: string | null;
  state: HomeMomentState;
  forming: { id: string; title: string | null }[];
  recent: { id: string; title: string | null; durationMs?: number | null }[];
  /** Counts for the Collections grid; a card only renders when its count > 0. */
  favoritesCount?: number;
  onDemandCount?: number;
  onPlay: (momentId: string) => void;
  onRetry: () => void;
  /** Toggles today's keep mark. Premium beyond the Letter (12 §4). */
  onFavorite: (momentId: string) => void;
  onManifest: () => void;
  onCollection?: (id: CollectionId) => void;
  /** One quiet line a week when notifications were declined (11 §2). */
  notificationHint?: string | null;
  /** The legible "why" under today's moment — e.g. "Shaped around family & love." */
  personalization?: string | null;
  /**
   * The daily count (21). Passed in rather than read from the store here so
   * HomeScreen stays a presentational component — the same reason `state` and
   * `recent` are props.
   */
  streak: StreakState;
  lastOutcome: StreakOutcome['kind'] | null;
  onOpenStreak?: () => void;
  /** The one-time first-Home welcome/orientation card (2026-08-10). */
  showFirstRun?: boolean;
  onDismissFirstRun?: () => void;
  testID?: string;
}

/** "Tuesday, July 22" — her own calendar, for the header label (v4 §home). */
export function formatHomeDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
}

/** "1:30" for a recent row's trailing text. */
function durationText(durationMs: number | null | undefined): string | null {
  if (!durationMs || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Home (product 11, 09 §9.1, v4 §home "the daily heartbeat").
 *
 * Ordered by what she came for: the moment first, what is coming next, her
 * collections, then what she has already heard. The "+" is the Manifest entry
 * and sits on the Home surface rather than becoming a fifth tab (06 §6/§7).
 *
 * There is no empty state anywhere in here, by design: every branch of
 * `HomeMomentState` renders something she can act on, and the optional
 * sections simply stay away until they have something real to show.
 */
export function HomeScreen({
  name,
  state,
  forming,
  recent,
  favoritesCount = 0,
  onDemandCount = 0,
  onPlay,
  onRetry,
  onFavorite,
  onManifest,
  onCollection,
  notificationHint = null,
  personalization = null,
  streak,
  lastOutcome,
  onOpenStreak,
  showFirstRun = false,
  onDismissFirstRun,
  testID,
}: HomeScreenProps) {
  const { colors, spacing, layout, radii } = useTheme();
  const scale = clampedFontScale();
  const tabBarClearance = useTabBarClearance();

  const greeting = name
    ? momentsCopy.home[greetingFor()].replace('{name}', name)
    : momentsCopy.home.anonymousGreeting;

  return (
    <ScrollView
      testID={testID}
      contentContainerStyle={{
        padding: layout.screenMargin,
        gap: layout.homeSectionGap,
        paddingBottom: tabBarClearance,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Label>{formatHomeDate()}</Label>
          <SerifDisplay variant="title">{greeting}</SerifDisplay>
        </View>
        <Orb state="idle" size={HEADER_ORB_SIZE} testID="home-orb" />
      </View>

      {/*
        The count sits directly under the greeting and above today's moment
        (21 §4.2) — the only slot on Home she reliably sees. It renders nothing
        until she has counted a day, so a fresh install is unchanged.
      */}
      <StreakCard
        state={streak}
        month={monthFrom(streak, localDay(new Date()))}
        lastOutcome={lastOutcome}
        {...(onOpenStreak !== undefined && { onPress: onOpenStreak })}
        testID="home-streak"
      />

      {showFirstRun && (
        <View testID="home-first-run-welcome">
          <Card
            variant="solid"
            style={{ backgroundColor: colors.accent.parchment, gap: spacing.sm }}
          >
            <SerifDisplay variant="momentTitle">
              {name
                ? momentsCopy.home.firstRun.title.replace('{name}', name)
                : momentsCopy.home.firstRun.welcomeNoName}
            </SerifDisplay>
            <Text
              allowFontScaling={false}
              style={[scaledType('body', scale), { color: colors.text.secondary }]}
            >
              {momentsCopy.home.firstRun.body}
            </Text>
            <TextButton
              title={momentsCopy.home.firstRun.dismiss}
              onPress={() => onDismissFirstRun?.()}
              testID="home-first-run-dismiss"
            />
          </Card>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Label>{momentsCopy.home.todayLabel}</Label>
        <TodayMomentCard
          state={state}
          onPlay={onPlay}
          onRetry={onRetry}
          onFavorite={onFavorite}
          secondary={personalization ?? undefined}
        />
      </View>

      {forming.length > 0 && (
        <View style={{ gap: spacing.sm }} testID="home-forming">
          <Label>{momentsCopy.home.comingLabel}</Label>
          <View
            style={{
              // Two previews sit side by side; one (or three) stack (v4 §home).
              flexDirection: forming.length === 2 ? 'row' : 'column',
              gap: spacing.sm,
            }}
          >
            {forming.map((item) => (
              <Card
                key={item.id}
                variant="dashed"
                // v4 gives these tiles their own metrics: the 22pt card radius
                // and 20pt padding belong to heroes, not to a two-line promise.
                style={[
                  {
                    borderRadius: radii.field,
                    paddingVertical: layout.rowPaddingV,
                    paddingHorizontal: layout.rowPaddingH,
                  },
                  forming.length === 2 ? { flex: 1 } : null,
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
                >
                  {item.title ?? momentsCopy.states.formingPreview}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}

      {(favoritesCount > 0 || onDemandCount > 0) && (
        <View style={{ gap: spacing.sm }} testID="home-collections">
          <Label>{momentsCopy.home.collectionsLabel}</Label>
          {/* A wrapping grid, not one row: v4 lays collections out two per
              line so a third and fourth fall underneath rather than squeezing. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {favoritesCount > 0 && (
              <CollectionCard
                id="favorites"
                title={momentsCopy.collections.favorites}
                count={favoritesCount}
                heart
                onCollection={onCollection}
              />
            )}
            {onDemandCount > 0 && (
              <CollectionCard
                id="ondemand"
                title={momentsCopy.collections.ondemand}
                count={onDemandCount}
                onCollection={onCollection}
              />
            )}
            {/* Keeps a lone card at grid width, like the 2-column design. */}
            {favoritesCount > 0 !== onDemandCount > 0 && <View style={{ flex: 1 }} />}
          </View>
        </View>
      )}

      {recent.length > 0 && (
        <View style={{ gap: spacing.sm }} testID="home-recent">
          <Label>{momentsCopy.home.recentLabel}</Label>
          <RowGroup style={{ borderRadius: radii.field }}>
            {recent.map((item) => (
              <RecentRow
                key={item.id}
                title={item.title ?? momentsCopy.home.untitled}
                duration={durationText(item.durationMs)}
                onPress={() => onPlay(item.id)}
                testID={`home-recent-${item.id}`}
              />
            ))}
          </RowGroup>
        </View>
      )}

      {notificationHint && (
        <Text
          testID="home-notification-hint"
          allowFontScaling={false}
          style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
        >
          {notificationHint}
        </Text>
      )}

      <PillButton title={momentsCopy.home.manifest} onPress={onManifest} testID="home-manifest" />
    </ScrollView>
  );
}

/** One tinted grid card: Favorites (blush) or On demand (parchment). */
function CollectionCard({
  id,
  title,
  count,
  heart = false,
  onCollection,
}: {
  id: CollectionId;
  title: string;
  count: number;
  heart?: boolean;
  onCollection: ((id: CollectionId) => void) | undefined;
}) {
  const { colors, layout, radii, spacing } = useTheme();
  const scale = clampedFontScale();

  const countLine =
    count === 1
      ? momentsCopy.collections.momentCountOne
      : momentsCopy.collections.momentCount.replace('{n}', String(count));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${countLine}`}
      onPress={onCollection ? () => onCollection(id) : undefined}
      disabled={!onCollection}
      testID={`home-collection-${id}`}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: radii.field,
        paddingVertical: layout.tilePaddingV,
        paddingHorizontal: layout.rowPaddingH,
        gap: spacing.xs / 2,
        backgroundColor: heart ? colors.accent.blushSoft : colors.accent.parchment,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        style={[scaledType('button', scale), { color: colors.text.primary }]}
      >
        {title}
      </Text>
      <Text
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
      >
        {countLine}
        {heart ? <Text style={{ color: colors.accent.heart }}>{' · ♥'}</Text> : null}
      </Text>
    </Pressable>
  );
}

/**
 * One "Recently played" row (v4 §home).
 *
 * Not a `ListRow`: v4 sets a moment's name in SERIF and its duration in
 * monospace, where `ListRow`'s sans title and 13pt meta are the language of
 * settings and profile rows. A moment's name is a title, not a control label,
 * and monospaced figures keep a column of durations aligned.
 */
function RecentRow({
  title,
  duration,
  onPress,
  testID,
}: {
  title: string;
  duration: string | null;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, layout } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={duration ? `${title}, ${duration}` : title}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.rowPaddingV - 2,
        paddingVertical: layout.rowPaddingV,
        paddingHorizontal: layout.rowPaddingH,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[scaledType('rowTitle', scale), { flex: 1, color: colors.text.primary }]}
      >
        {title}
      </Text>
      {duration && (
        <Text
          allowFontScaling={false}
          style={[scaledType('rowMeta', scale), { color: colors.text.label }]}
        >
          {duration}
        </Text>
      )}
    </Pressable>
  );
}
