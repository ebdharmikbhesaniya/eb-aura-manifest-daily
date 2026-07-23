import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, ScrollView, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import {
  Card,
  IconTile,
  Label,
  ListRow,
  RowGroup,
  Screen,
  SerifDisplay,
  TAB_BAR_CLEARANCE,
} from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { AffirmationCard } from '@/features/affirmations/AffirmationCard';
import { GuidedSheet, type GuidedStep } from '@/features/affirmations/GuidedSheet';
import { useGenerationJob } from '@/features/letter/useGenerationJob';
import { TechniqueSheet } from '@/features/affirmations/TechniqueSheet';
import { captureShareCard, toShareContent } from '@/features/affirmations/shareCard';
import { recordBeat, TECHNIQUES } from '@/features/affirmations/practice';
import {
  useAffirmationCandidates,
  useKeptAffirmations,
  useTodaysAffirmation,
} from '@/features/affirmations/useAffirmations';
import { localDate } from '@/features/gratitude/useGratitude';
import { OutlinePill } from '@/features/paywall/OutlinePill';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorCopyForKey } from '@/lib/errorCopy';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/**
 * The Affirmations tab (product 09 §9.3, v4 layout): today's card on the
 * parchment surface, the guided studio behind a white "Create with Aura" row,
 * then the saved words. Revealing today's card is one of the three ritual
 * beats, so it records progress here (product 09) — the event fires only when
 * all three happen on the same day.
 */
export default function AffirmationsRoute() {
  const { colors, spacing, typography } = useTheme();
  const scale = clampedFontScale();
  const userId = useAppState((s) => s.userId);

  const today = useTodaysAffirmation(userId ?? undefined);
  const kept = useKeptAffirmations(userId ?? undefined);
  const candidates = useAffirmationCandidates(userId ?? undefined);

  const guidedRef = useRef<BottomSheetModal>(null);
  const techniqueRef = useRef<BottomSheetModal>(null);
  const shareRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [step, setStep] = useState<GuidedStep>('goal');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // The guided pass is async: the POST only enqueues a job, so the candidates
  // are not written until it finishes. We poll the job and refetch the candidate
  // rows only once it succeeds — refetching at enqueue (the old bug) always read
  // an empty set and left the sheet stuck on "Writing them…".
  const [guidedJobId, setGuidedJobId] = useState<string | undefined>();
  const guidedJob = useGenerationJob(guidedJobId);
  const [guidedError, setGuidedError] = useState<string | null>(null);

  // `affirmations.technique` is a free text column the generator fills; anything
  // unrecognised falls back to identity rather than rendering no chip at all.
  const stored = today.data?.technique;
  const technique = TECHNIQUES.includes(stored as never)
    ? (stored as (typeof TECHNIQUES)[number])
    : 'identity';

  const reveal = useCallback(() => {
    setRevealed(true);
    void haptic('affirmationReveal');
    analytics.capture('affirmation_revealed');

    const { justCompleted } = recordBeat(localDate(), 'affirmation');
    if (justCompleted) analytics.capture('ritual_completed');
  }, []);

  const generate = useCallback(
    (input: Parameters<React.ComponentProps<typeof GuidedSheet>['onGenerate']>[0]) => {
      setBusy(true);
      setGuidedError(null);
      setStep('candidates');
      void api
        .generateGuidedAffirmation(input)
        .then((res) => {
          analytics.capture('affirmation_generated_guided', {
            goal_area: input.goalArea,
            tone: input.tone,
          });
          // Hand off to the poll; busy stays true until the job is terminal.
          setGuidedJobId(res.jobId);
        })
        .catch((error: unknown) => {
          setBusy(false);
          setGuidedError(errorCopyFor(error));
        });
    },
    [],
  );

  // When the guided job reaches a terminal state, stop the spinner. On success
  // the candidate rows now exist, so refetch to render them.
  const guidedStatus = guidedJob.data?.status;
  useEffect(() => {
    if (!guidedStatus) return;
    if (guidedStatus === 'succeeded') void candidates.refetch();

    // A failed pass wrote no candidate rows, so the candidate step would render
    // its title over an empty panel with nothing to tap — a dead end she can
    // only escape by dismissing the sheet and starting over. Say what happened
    // and put her back on the tone step, where one tap retries.
    if (guidedStatus === 'failed' || guidedStatus === 'qa_failed') {
      setGuidedError(errorCopyForKey('generation_failed'));
      setStep('tone');
      // Clearing the id stops the poll; a retry sets a fresh one.
      setGuidedJobId(undefined);
    }

    if (guidedStatus === 'succeeded' || guidedStatus === 'failed' || guidedStatus === 'qa_failed') {
      setBusy(false);
    }
  }, [guidedStatus, candidates]);

  /**
   * Share-as-image (product 09 §9.3).
   *
   * Captures the card she is looking at rather than a parallel export layout —
   * a second layout would drift from the real card within a release or two. The
   * content passes through `toShareContent`, whose narrow return type is what
   * guarantees only the affirmation text leaves the device (product 18).
   */
  const share = useCallback(async () => {
    if (!today.data || !shareRef.current) return;

    const content = toShareContent({ affirmation: today.data.text });
    const uri = await captureShareCard(shareRef.current as never);

    await Share.share({ url: uri, message: content.affirmation });
    analytics.capture('affirmation_shared', { format: 'image' });
  }, [today.data]);

  const keep = useCallback(
    (candidateId: string) => {
      setGuidedError(null);
      api
        .keepAffirmation(candidateId)
        .then(() => {
          analytics.capture('affirmation_saved');
          guidedRef.current?.dismiss();
          void kept.refetch();
          void candidates.refetch();
        })
        // Without this the request rejected unhandled and the failure surfaced
        // as a redbox with a Java stack trace — a technical string reaching the
        // surface, which 05 §8 forbids. She keeps the sheet and a line she can
        // act on instead.
        .catch((error: unknown) => setGuidedError(errorCopyFor(error)));
    },
    [kept, candidates],
  );

  // "Today · July 22" — the device's own month-day words, no invented format.
  const dateLabel = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const keptItems = kept.data ?? [];

  return (
    <Screen testID="affirmations" edgeToEdge>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          // The tab bar floats over this screen and reserves nothing, so the
          // last kept card ends up underneath it without this. The other three
          // tab screens already do the same.
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
      >
        <SerifDisplay variant="title">{affirmationsCopy.title}</SerifDisplay>

        {today.data && (
          <ViewShot ref={shareRef} options={{ format: 'png', quality: 1 }}>
            <AffirmationCard
              text={today.data.text}
              whyLine={today.data.why_line}
              // The generator stores a technique per card; identity is the default
              // form the prompt asks for (product 09 §9.3a), so an older row with
              // none still gets a chip rather than silently losing the layer.
              technique={technique}
              dateLabel={dateLabel}
              revealed={revealed}
              onReveal={reveal}
              onTechnique={() => {
                analytics.capture('technique_chip_opened', { technique });
                techniqueRef.current?.present();
              }}
              testID="affirmation-today"
            />
          </ViewShot>
        )}

        {/* Below the ViewShot, not inside it — the shared image stays only her words. */}
        {revealed && today.data && (
          <OutlinePill
            title={affirmationsCopy.share}
            onPress={() => void share()}
            testID="affirmation-share"
          />
        )}

        {revealed && (
          <Text
            testID="affirmation-enough"
            style={[typography.bodySmall, { color: colors.text.secondary, textAlign: 'center' }]}
          >
            {affirmationsCopy.enough}
          </Text>
        )}

        <RowGroup separatorInset="leading">
          <ListRow
            title={affirmationsCopy.create}
            subtitle={affirmationsCopy.createSubtitle}
            leading={<IconTile tint="orb" />}
            trailing={
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                allowFontScaling={false}
                style={[scaledType('body', scale), { color: colors.cta.link }]}
              >
                ›
              </Text>
            }
            onPress={() => {
              setStep('goal');
              guidedRef.current?.present();
            }}
            testID="affirmations-create"
          />
        </RowGroup>

        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Label>{`${affirmationsCopy.savedLabel} · ${keptItems.length}`}</Label>

          {keptItems.length === 0 ? (
            <Card variant="solid">
              <Text
                testID="affirmations-collection-empty"
                style={[typography.body, { color: colors.text.secondary }]}
              >
                {affirmationsCopy.collectionEmpty}
              </Text>
            </Card>
          ) : (
            keptItems.map((item) => <KeptRow key={item.id} text={item.text} />)
          )}
        </View>
      </ScrollView>

      <TechniqueSheet ref={techniqueRef} technique={technique} today={localDate()} />

      <GuidedSheet
        ref={guidedRef}
        step={step}
        busy={busy}
        candidates={(candidates.data ?? []).map((c) => ({
          id: c.id,
          text: c.text,
          whyLine: c.why_line,
        }))}
        error={guidedError}
        onStep={setStep}
        onGenerate={generate}
        onKeep={keep}
      />
    </Screen>
  );
}

/** A kept affirmation (v4 §saved): her words in the voice serif, heart-marked. */
function KeptRow({ text }: { text: string }) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <Card variant="solid" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Text
        allowFontScaling={false}
        style={[scaledType('letterLine', scale), { flex: 1, color: colors.text.body }]}
      >
        “{text}”
      </Text>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: colors.accent.heart }]}
      >
        ♥
      </Text>
    </Card>
  );
}
