import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Screen } from '@/components';
import { HomeScreen } from '@/features/moments/HomeScreen';
import { ManifestSheet } from '@/features/moments/ManifestSheet';
import { resolveHomeMoment } from '@/features/moments/momentState';
import {
  localDateToday,
  toPlayable,
  useFormingMoments,
  useRecentMoments,
  useTodaysMoment,
} from '@/features/moments/useMoments';
import { notificationsCopy } from '@/copy/notifications';
import { PermissionSheet } from '@/features/notifications/PermissionSheet';
import {
  markDeniedHintShown,
  markPermissionAsked,
  shouldAskPermission,
  shouldShowDeniedHint,
} from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';
import { formatArrivalTime } from '@/features/notifications/arrivalTime';
import { hasSeenPaywall } from '@/features/paywall/paywallSeen';
import { LockedFeatureSheet } from '@/features/paywall/LockedFeatureSheet';
import { canUse } from '@/features/paywall/gating';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { usePlayerStore } from '@/features/player/playerStore';
import { useProfile } from '@/hooks/useProfile';
import { LIMITS } from '@aura/shared';

import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorKeyOf } from '@/lib/errorCopy';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';

/** Home's "Recently played" shows this many rows; the rest live in collections. */
const RECENT_ROWS = 5;
/** Wide enough to count favourites and on-demand moments for the grid (v4 §home). */
const COLLECTION_SCAN_LIMIT = 50;

/**
 * Home (product 11). The route stays thin: it resolves which state to show and
 * owns navigation, while `HomeScreen` is pure presentation — so every state can
 * be rendered in a test without a navigator or a network.
 */
export default function HomeRoute() {
  const router = useRouter();
  const userId = useAppState((s) => s.userId);
  const { data: profile } = useProfile(userId ?? undefined);
  const entitlement = useEntitlement();

  const today = useTodaysMoment(userId ?? undefined);
  const forming = useFormingMoments(userId ?? undefined);
  const recent = useRecentMoments(userId ?? undefined, COLLECTION_SCAN_LIMIT);

  const open = usePlayerStore((s) => s.open);
  const manifestRef = useRef<BottomSheetModal>(null);
  const lockedRef = useRef<BottomSheetModal>(null);
  const permissionRef = useRef<BottomSheetModal>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  // Seeded from the shared default and corrected by the server's answer on every
  // manifest (07 §1 returns `creditsRemaining`). Optimistic by design — 12 §4
  // makes the server the authority, so a stale local number costs at most one
  // honest 429 that the sheet now renders.
  const [credits, setCredits] = useState<number>(LIMITS.MANIFEST_WEEKLY_LIMIT);
  const [deniedHint, setDeniedHint] = useState(false);

  // The permission ask lands HERE — the first Home landing after the paywall
  // (11 §2), which is the earliest moment product 08's "nothing between the
  // letter and the paywall" rule stops applying.
  useEffect(() => {
    if (shouldAskPermission(hasSeenPaywall())) {
      permissionRef.current?.present();
      return;
    }
    // Declined earlier: one quiet line a week, never a re-ask (11 §2).
    if (shouldShowDeniedHint()) {
      setDeniedHint(true);
      markDeniedHintShown();
    }
  }, []);

  const state = resolveHomeMoment({
    latest: today.data ?? null,
    latestScheduledFor: null,
    today: localDateToday(),
    generating: today.isFetching,
    failed,
  });

  const play = useCallback(
    (momentId: string) => {
      const moment = today.data;
      if (moment?.id === momentId) {
        open(moment);
        router.push('/player');
        return;
      }
      // A recent row: only the slim listing is in memory, so fetch the full
      // moment before handing it to the player — same shape as `collection/[id]`.
      void (async () => {
        const { data } = await supabase
          .from('moments')
          .select('*')
          .eq('id', momentId)
          .maybeSingle();
        if (!data) return;
        open(await toPlayable(data), 'replay');
        router.push('/player');
      })();
    },
    [today.data, open, router],
  );

  const retry = useCallback(async () => {
    setFailed(false);
    try {
      await api.requestMoment(localDateToday());
      await today.refetch();
    } catch {
      setFailed(true);
    }
  }, [today]);

  /**
   * Keep / un-keep today's moment (12 §4).
   *
   * The same write the player cover does — `favorited_at` is one of the three
   * engagement columns her own JWT may update, so this needs no endpoint. Home's
   * heart rendered that column from the start but was never pressable, which is
   * why keeping only worked from inside the player.
   */
  const onFavorite = useCallback(
    async (momentId: string) => {
      if (!canUse('favorites', entitlement)) {
        lockedRef.current?.present();
        return;
      }

      const current = today.data?.favoritedAt ?? null;
      await supabase
        .from('moments')
        .update({ favorited_at: current ? null : new Date().toISOString() })
        .eq('id', momentId);

      void haptic('favorite');
      await today.refetch();
      // The Collections count reads the same column, so it has to re-read too.
      await recent.refetch();
    },
    [entitlement, today, recent],
  );

  const onManifest = useCallback(() => {
    // Manifest is premium (12 §4). The locked sheet is calm and never a
    // full-screen interrupt.
    if (!canUse('manifest_anything', entitlement)) {
      lockedRef.current?.present();
      return;
    }
    manifestRef.current?.present();
  }, [entitlement]);

  return (
    <Screen testID="home" edgeToEdge>
      <HomeScreen
        name={profile?.name ?? null}
        state={state}
        forming={forming.data ?? []}
        recent={(recent.data ?? []).slice(0, RECENT_ROWS).map((m) => ({
          id: m.id,
          title: m.title,
          durationMs: m.duration_ms,
        }))}
        favoritesCount={(recent.data ?? []).filter((m) => m.favorited_at !== null).length}
        onDemandCount={(recent.data ?? []).filter((m) => m.type === 'ondemand').length}
        onPlay={play}
        onRetry={() => void retry()}
        onFavorite={(id) => void onFavorite(id)}
        onManifest={onManifest}
        onCollection={(id) => router.push(`/collection/${id}`)}
        notificationHint={
          deniedHint
            ? notificationsCopy.deniedHint.replace(
                '{time}',
                formatArrivalTime(profile?.arrival_time),
              )
            : null
        }
      />

      <ManifestSheet
        ref={manifestRef}
        creditsRemaining={credits}
        error={manifestError}
        busy={busy}
        onSubmit={(desireText) => {
          setBusy(true);
          setManifestError(null);
          void api
            .manifest(desireText)
            .then((result) => {
              analytics.capture('manifest_anything_created', {
                credits_remaining: result.creditsRemaining,
              });
              setCredits(result.creditsRemaining);
              manifestRef.current?.dismiss();
            })
            .catch((error: unknown) => {
              // Every documented failure lands here now: 402, 429 credits,
              // 422 crisis. Before this, all three did nothing at all.
              if (errorKeyOf(error) === 'entitlement_required') {
                manifestRef.current?.dismiss();
                lockedRef.current?.present();
                return;
              }
              if (errorKeyOf(error) === 'credits_exhausted') setCredits(0);
              setManifestError(errorCopyFor(error));
            })
            .finally(() => setBusy(false));
        }}
      />

      <PermissionSheet
        ref={permissionRef}
        arrivalTime={formatArrivalTime(profile?.arrival_time)}
        onAllow={() => {
          markPermissionAsked(true);
          permissionRef.current?.dismiss();
          if (!userId) return;

          void (async () => {
            const { granted, registered } = await requestPermissionAndRegister(userId);

            // "Turn them on" used to end here regardless of what happened, so a
            // grant that never produced a push token looked exactly like one
            // that did. Below Android 13 the OS shows no dialog at all, which
            // made the button appear inert even on the happy path. Anything
            // short of a registered token now falls back to the same quiet
            // weekly line a decline gets — never a claim we cannot keep.
            if (granted && registered) return;

            setDeniedHint(true);
            markDeniedHintShown();
          })();
        }}
        onLater={() => {
          // Asked and declined is still asked: the dialog never returns
          // uninvited (11 §2). A quiet weekly hint is the only follow-up.
          markPermissionAsked(true);
          setDeniedHint(true);
          markDeniedHintShown();
          permissionRef.current?.dismiss();
        }}
      />

      <LockedFeatureSheet
        ref={lockedRef}
        feature="manifest_anything"
        onSeePlans={() => {
          lockedRef.current?.dismiss();
          router.push('/paywall');
        }}
        onDismiss={() => lockedRef.current?.dismiss()}
      />
    </Screen>
  );
}
